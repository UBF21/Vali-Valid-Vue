import { computed, onMounted, onUnmounted, reactive, ref, shallowRef } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { ValiValid } from 'vali-valid';
import type { FieldValidationConfig, FormErrors, ValidationsConfig } from 'vali-valid';

export interface UseValiValidOptions<T extends Record<string, any>> {
    initial: T;
    validations?: FieldValidationConfig<T>[];
    validateOnBlur?: boolean;
    validateOnSubmit?: boolean;
    debounceMs?: number;
    asyncTimeout?: number; // Default: 10000
    criteriaMode?: 'all' | 'firstError';
    /** Per-instance locale override (e.g. 'en', 'es', 'pt', 'fr', 'de'). Does not mutate the global locale. */
    locale?: string;
    validateOnMount?: boolean;
}

export interface UseValiValidReturn<T extends Record<string, any>> {
    form: T;
    errors: FormErrors<T>;
    isValid: ComputedRef<boolean>;
    isValidating: Ref<boolean>;
    isSubmitted: Ref<boolean>;
    submitCount: Ref<number>;
    touchedFields: Ref<Set<keyof T>>;
    dirtyFields: Ref<Set<keyof T>>;
    handleChange: (field: keyof T, value: any) => void;
    handleBlur: (field: keyof T) => void;
    validate: () => Promise<FormErrors<T>>;
    reset: (newInitial?: Partial<T>) => void;
    handleSubmit: (onSubmit: (form: T) => void | Promise<void>) => (e?: Event) => Promise<void>;
    setServerErrors: (errors: Partial<FormErrors<T>>) => void;
    setValues: (values: Partial<T>) => void;
    addFieldValidation: (field: keyof T, validations: ValidationsConfig[]) => void;
    removeFieldValidation: (field: keyof T, type: string) => void;
    setFieldValidations: (field: keyof T, validations: ValidationsConfig[]) => void;
    clearFieldValidations: (field: keyof T) => void;
    trigger: (field?: keyof T) => Promise<FormErrors<T>>;
    clearErrors: (field?: keyof T) => void;
    getValues: () => T;
}

function deepClone<V>(value: V): V {
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Date) return new Date((value as Date).getTime()) as unknown as V;
    if (Array.isArray(value)) return (value as unknown[]).map(deepClone) as unknown as V;
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    Object.keys(src).forEach((k) => { out[k] = deepClone(src[k]); });
    return out as V;
}

function withTimeout<R>(promise: Promise<R>, ms: number): Promise<R> {
    if (ms <= 0) return promise;
    let timerId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<R>((_, reject) => {
        timerId = setTimeout(() => reject(new Error('[ValiValid] Async timeout')), ms);
    });
    return Promise.race([
        promise.then((v) => { clearTimeout(timerId!); return v; }, (e) => { clearTimeout(timerId!); throw e; }),
        timeout,
    ]);
}

export function useValiValid<T extends Record<string, any>>(
    options: UseValiValidOptions<T>
): UseValiValidReturn<T> {
    // Non-reactive: engine, timers, epoch counters
    const engine = new ValiValid<T>(options.validations ?? [], { criteriaMode: options.criteriaMode ?? 'all', locale: options.locale, asyncTimeout: options.asyncTimeout });
    // _originalInitial: immutable — never mutated; used as base for bare reset()
    const _originalInitial: T = deepClone(options.initial);
    // _dirtyBase: tracks what "clean" means for dirty comparisons; updated by reset(newInitial)
    let _dirtyBase: T = deepClone(_originalInitial);
    const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
    // Tracks count of in-flight async promises per field — separate from debounce timers
    const asyncInFlightMap = new Map<string, number>();
    // Global epoch: incremented by reset(), validate(), handleChange() to invalidate stale results
    let _epoch = 0;
    // Per-field epoch: incremented by _cancelFieldAsync() to invalidate a single field's in-flight
    // promise without touching the global epoch used by validate() and handleSubmit().
    const _fieldEpoch = new Map<string, number>();
    let _isSubmitting = false;

    // Reactive state
    const formState = reactive<T>({ ...options.initial }) as T;
    const errorsState = reactive<FormErrors<T>>({}) as FormErrors<T>;
    const isValidating = ref(false);
    const isSubmitted = ref(false);
    const submitCount = ref(0);
    // Vue shallowRef<Set>: avoids UnwrapRefSimple<keyof T> conflicts; replace reference to trigger reactivity
    const touchedFields = shallowRef<Set<keyof T>>(new Set());
    const dirtyFields = shallowRef<Set<keyof T>>(new Set());

    // Derived: recomputes when errorsState changes
    const isValid = computed<boolean>(() => {
        const vals = Object.values(errorsState);
        if (vals.length === 0) return true;
        return vals.every((e) => e === null || e === undefined || (Array.isArray(e) && e.length === 0));
    });

    function runFieldValidation(field: keyof T, sanitizedValue: any): void {
        const syncError = engine.validateFieldSync(field, sanitizedValue, { ...formState } as T);
        errorsState[field as keyof T] = syncError as FormErrors<T>[keyof T];

        if (engine.hasAsyncRules(field)) {
            const fieldKey = String(field);
            const existing = debounceTimers.get(fieldKey);
            if (existing) clearTimeout(existing);
            isValidating.value = true;
            const epoch = _epoch;
            const fEpoch = _fieldEpoch.get(fieldKey) ?? 0;

            const timer = setTimeout(async () => {
                // Remove debounce entry immediately on fire (C5 fix)
                debounceTimers.delete(fieldKey);
                asyncInFlightMap.set(fieldKey, (asyncInFlightMap.get(fieldKey) ?? 0) + 1);
                try {
                    const asyncError = await withTimeout(
                        engine.validateFieldAsync(field, sanitizedValue, { ...formState } as T),
                        options.asyncTimeout ?? 10000
                    );
                    // Stale check: global epoch (reset/validate/handleChange) OR per-field epoch (_cancelFieldAsync)
                    if (_epoch !== epoch || (_fieldEpoch.get(fieldKey) ?? 0) !== fEpoch) return;
                    errorsState[field as keyof T] = asyncError as FormErrors<T>[keyof T];
                } catch {
                    // async validator threw — leave existing error
                } finally {
                    // Always decrement in-flight count to keep isValidating accurate (even on stale)
                    const remaining = (asyncInFlightMap.get(fieldKey) ?? 1) - 1;
                    if (remaining <= 0) asyncInFlightMap.delete(fieldKey);
                    else asyncInFlightMap.set(fieldKey, remaining);
                    if (debounceTimers.size === 0 && asyncInFlightMap.size === 0) isValidating.value = false;
                }
            }, options.debounceMs ?? 0);

            debounceTimers.set(fieldKey, timer);
        }

        // Re-validate fields that watch this field (cross-field rules)
        const watchers = engine.getWatchedFields(String(field));
        watchers.forEach((wf) => {
            const wSanitized = engine.getFieldValue(wf as keyof T, (formState as T)[wf as keyof T]);
            errorsState[wf as keyof T] = engine.validateFieldSync(wf as keyof T, wSanitized, { ...formState } as T) as FormErrors<T>[keyof T];
            if (engine.hasAsyncRules(wf as keyof T)) {
                const existing = debounceTimers.get(wf);
                if (existing) clearTimeout(existing);
                isValidating.value = true;
                const wEpoch = _epoch;
                const wFEpoch = _fieldEpoch.get(wf) ?? 0;
                const wTimer = setTimeout(async () => {
                    // Remove debounce entry immediately on fire (C5 fix)
                    debounceTimers.delete(wf);
                    asyncInFlightMap.set(wf, (asyncInFlightMap.get(wf) ?? 0) + 1);
                    try {
                        // Re-derive at timer-fire time so the value is consistent with the current form
                        const freshForm = { ...formState } as T;
                        const freshSanitized = engine.getFieldValue(wf as keyof T, (formState as T)[wf as keyof T]);
                        const asyncErr = await withTimeout(
                            engine.validateFieldAsync(wf as keyof T, freshSanitized, freshForm),
                            options.asyncTimeout ?? 10000
                        );
                        if (_epoch !== wEpoch || (_fieldEpoch.get(wf) ?? 0) !== wFEpoch) return;
                        errorsState[wf as keyof T] = asyncErr as FormErrors<T>[keyof T];
                    } catch { /* leave sync error */ } finally {
                        // Always decrement in-flight count to keep isValidating accurate (even on stale)
                        const remaining = (asyncInFlightMap.get(wf) ?? 1) - 1;
                        if (remaining <= 0) asyncInFlightMap.delete(wf);
                        else asyncInFlightMap.set(wf, remaining);
                        if (debounceTimers.size === 0 && asyncInFlightMap.size === 0) isValidating.value = false;
                    }
                }, options.debounceMs ?? 0);
                debounceTimers.set(wf, wTimer);
            }
        });
    }

    function handleChange(field: keyof T, value: any): void {
        // Invalidate any in-flight full-form validate() result so it cannot overwrite per-field results
        _epoch += 1;
        const sanitized = engine.getFieldValue(field, value);
        (formState as T)[field as keyof T] = sanitized;

        const nextDirty = new Set(dirtyFields.value);
        if (sanitized !== _dirtyBase[field as keyof T]) {
            nextDirty.add(field);
        } else {
            nextDirty.delete(field);
        }
        dirtyFields.value = nextDirty;

        const skipValidation = options.validateOnBlur || (options.validateOnSubmit && !isSubmitted.value);
        if (!skipValidation) runFieldValidation(field, sanitized);
    }

    function handleBlur(field: keyof T): void {
        const nextTouched = new Set(touchedFields.value);
        nextTouched.add(field);
        touchedFields.value = nextTouched;

        const shouldValidate = options.validateOnBlur || (options.validateOnSubmit && isSubmitted.value);
        if (shouldValidate) {
            const sanitized = engine.getFieldValue(field, (formState as T)[field as keyof T]);
            runFieldValidation(field, sanitized);
        }
    }

    async function validate(): Promise<FormErrors<T>> {
        // Cancel pending per-field async timers so they don't overwrite the full-validate result
        debounceTimers.forEach((t) => clearTimeout(t));
        debounceTimers.clear();
        asyncInFlightMap.clear();
        _epoch += 1;
        const epoch = _epoch;
        isValidating.value = true;
        try {
            const allErrors = await engine.validateAsync({ ...formState } as T);
            // Guard: discard result if reset() or handleChange() was called while we were awaiting
            if (_epoch !== epoch) return allErrors;
            // Full replace (not merge) so stale server errors are cleared on re-validation
            Object.keys(errorsState).forEach((k) => { delete (errorsState as Partial<Record<keyof T, string[] | null>>)[k as keyof T]; });
            Object.assign(errorsState, allErrors);
            return allErrors;
        } finally {
            if (_epoch === epoch) isValidating.value = false;
        }
    }

    function reset(newInitial?: Partial<T>): void {
        // Compute new baseline — always merge against _originalInitial, never against a previously
        // mutated snapshot, so a bare reset() always restores the original options.initial values.
        const next: T = newInitial ? { ...deepClone(_originalInitial), ...newInitial } : deepClone(_originalInitial);
        // Update dirty baseline so subsequent dirty comparisons use the reset snapshot
        _dirtyBase = next;
        // Remove keys added dynamically (not in initial) then restore initial values
        Object.keys(formState).forEach((k) => { if (!(k in next)) delete (formState as T)[k as keyof T]; });
        Object.keys(next).forEach((k) => { (formState as T)[k as keyof T] = next[k as keyof T]; });
        Object.keys(errorsState).forEach((k) => { delete (errorsState as Partial<Record<keyof T, string[] | null>>)[k as keyof T]; });
        isValidating.value = false;
        isSubmitted.value = false;
        submitCount.value = 0;
        touchedFields.value = new Set();
        dirtyFields.value = new Set();
        debounceTimers.forEach((t) => clearTimeout(t));
        debounceTimers.clear();
        asyncInFlightMap.clear();
        _epoch += 1;
    }

    function handleSubmit(onSubmit: (form: T) => void | Promise<void>): (e?: Event) => Promise<void> {
        return async (e?: Event) => {
            if (_isSubmitting) return;
            _isSubmitting = true;
            e?.preventDefault();
            try {
                isSubmitted.value = true;
                submitCount.value++;
                const allErrors = await validate();
                const valid = Object.values(allErrors).every(
                    (err) => err === null || err === undefined || (Array.isArray(err) && err.length === 0)
                );
                if (valid) await onSubmit({ ...formState } as T);
            } finally {
                _isSubmitting = false;
            }
        };
    }

    function setServerErrors(serverErrors: Partial<FormErrors<T>>): void {
        Object.assign(errorsState, serverErrors);
    }

    function setValues(values: Partial<T>): void {
        const nextDirty = new Set(dirtyFields.value);
        Object.keys(values).forEach((k) => {
            const field = k as keyof T;
            const sanitized = engine.getFieldValue(field, values[field]);
            (formState as T)[k as keyof T] = sanitized;
            if (sanitized !== _dirtyBase[k as keyof T]) nextDirty.add(field);
            else nextDirty.delete(field);
        });
        dirtyFields.value = nextDirty;

        const skipValidation = options.validateOnBlur || (options.validateOnSubmit && !isSubmitted.value);
        if (!skipValidation) {
            Object.keys(values).forEach((k) => {
                const field = k as keyof T;
                runFieldValidation(field, engine.getFieldValue(field, values[field]));
            });
        }
    }

    function _cancelFieldAsync(field: keyof T): void {
        const key = String(field);
        const existing = debounceTimers.get(key);
        if (existing) { clearTimeout(existing); debounceTimers.delete(key); }
        asyncInFlightMap.delete(key);
        // Per-field epoch: invalidates in-flight promise for this field without disrupting validate()
        _fieldEpoch.set(key, (_fieldEpoch.get(key) ?? 0) + 1);
        if (debounceTimers.size === 0 && asyncInFlightMap.size === 0) isValidating.value = false;
    }

    function addFieldValidation(field: keyof T, validations: ValidationsConfig[]): void {
        _cancelFieldAsync(field);
        engine.addFieldValidation(field, validations);
        const sanitized = engine.getFieldValue(field, (formState as T)[field as keyof T]);
        errorsState[field as keyof T] = engine.validateFieldSync(field, sanitized, { ...formState } as T) as FormErrors<T>[keyof T];
    }

    function removeFieldValidation(field: keyof T, type: string): void {
        _cancelFieldAsync(field);
        engine.removeFieldValidation(field, type);
        const sanitized = engine.getFieldValue(field, (formState as T)[field as keyof T]);
        errorsState[field as keyof T] = engine.validateFieldSync(field, sanitized, { ...formState } as T) as FormErrors<T>[keyof T];
    }

    function setFieldValidations(field: keyof T, validations: ValidationsConfig[]): void {
        _cancelFieldAsync(field);
        engine.setFieldValidations(field, validations);
        const sanitized = engine.getFieldValue(field, (formState as T)[field as keyof T]);
        errorsState[field as keyof T] = engine.validateFieldSync(field, sanitized, { ...formState } as T) as FormErrors<T>[keyof T];
    }

    function clearFieldValidations(field: keyof T): void {
        _cancelFieldAsync(field);
        engine.clearFieldValidations(field);
        errorsState[field as keyof T] = null as FormErrors<T>[keyof T];
    }

    async function trigger(field?: keyof T): Promise<FormErrors<T>> {
        if (field !== undefined) {
            // Cancel any pending debounce timer or in-flight async for this field so a stale
            // result cannot overwrite what trigger() is about to produce.
            _cancelFieldAsync(field);

            const currentForm = { ...formState } as T;
            const sanitized = engine.getFieldValue(field, currentForm[field as keyof T]);

            // Run sync validation immediately
            const syncError = engine.validateFieldSync(field, sanitized, currentForm);
            (errorsState as Record<string, string[] | null>)[field as string] = syncError;

            // If async rules exist, await them directly (don't rely on setTimeout debounce)
            if (engine.hasAsyncRules(field)) {
                isValidating.value = true;
                try {
                    const asyncError = await withTimeout(
                        engine.validateFieldAsync(field, sanitized, currentForm),
                        options.asyncTimeout ?? 10000
                    );
                    (errorsState as Record<string, string[] | null>)[field as string] = asyncError;
                } catch {
                    // timeout or error — keep sync error
                } finally {
                    // Only lower isValidating flag if no other async validators are in flight
                    if (debounceTimers.size === 0 && asyncInFlightMap.size === 0) {
                        isValidating.value = false;
                    }
                }
            }

            return { ...errorsState } as FormErrors<T>;
        }
        return validate();
    }

    function clearErrors(field?: keyof T): void {
        if (field !== undefined) {
            (errorsState as Record<string, string[] | null>)[field as string] = null;
        } else {
            Object.keys(errorsState).forEach((k) => {
                delete (errorsState as Partial<Record<keyof T, string[] | null>>)[k as keyof T];
            });
        }
    }

    function getValues(): T {
        return deepClone({ ...formState } as T);
    }

    const mountEpoch = _epoch;
    onMounted(() => {
        if (options.validateOnMount && _epoch === mountEpoch) {
            validate();
        }
    });

    // Cleanup on component unmount — increment epoch to invalidate in-flight async promises,
    // then clear all timers and in-flight tracking to prevent post-unmount state writes.
    onUnmounted(() => {
        _epoch += 1;
        debounceTimers.forEach((t) => clearTimeout(t));
        debounceTimers.clear();
        asyncInFlightMap.clear();
        isValidating.value = false;
    });

    return {
        form: formState,
        errors: errorsState,
        isValid,
        isValidating,
        isSubmitted,
        submitCount,
        touchedFields,
        dirtyFields,
        handleChange,
        handleBlur,
        validate,
        reset,
        handleSubmit,
        setServerErrors,
        setValues,
        addFieldValidation,
        removeFieldValidation,
        setFieldValidations,
        clearFieldValidations,
        trigger,
        clearErrors,
        getValues,
    };
}
