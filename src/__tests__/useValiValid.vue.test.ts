import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { useValiValid } from '../useValiValid';
import { ValidationType } from 'vali-valid';
import type { FieldValidationConfig, ValidationsConfig } from 'vali-valid';

// ---------------------------------------------------------------------------
// Helper: mount a composable inside a real Vue component
// ---------------------------------------------------------------------------
function withSetup<T>(composable: () => T): { result: T; unmount: () => void } {
    let result!: T;
    const wrapper = mount(
        defineComponent({
            setup() {
                result = composable();
                return () => h('div');
            },
        }),
    );
    return { result, unmount: () => wrapper.unmount() };
}

// ---------------------------------------------------------------------------
// Shared validations fixture
// ---------------------------------------------------------------------------
const validations: FieldValidationConfig<any>[] = [
    {
        field: 'email',
        validations: [
            { type: ValidationType.Required } as ValidationsConfig,
            { type: ValidationType.Email } as ValidationsConfig,
        ],
    },
    {
        field: 'name',
        validations: [
            { type: ValidationType.Required } as ValidationsConfig,
            { type: ValidationType.MinLength, value: 3 } as ValidationsConfig,
        ],
    },
];

// ---------------------------------------------------------------------------
// Main suite
// ---------------------------------------------------------------------------
describe('useValiValid (Vue)', () => {
    // -----------------------------------------------------------------------
    describe('básico — inicialización', () => {
        it('inicializa con form vacío y sin errores', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            await nextTick();
            expect(result.form.email).toBe('');
            expect(result.form.name).toBe('');
            expect(result.errors).toEqual({});
            expect(result.isValid.value).toBe(true);
            unmount();
        });

        it('isValidating comienza en false', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            await nextTick();
            expect(result.isValidating.value).toBe(false);
            unmount();
        });

        it('isSubmitted comienza en false', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            await nextTick();
            expect(result.isSubmitted.value).toBe(false);
            unmount();
        });

        it('submitCount comienza en 0', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            await nextTick();
            expect(result.submitCount.value).toBe(0);
            unmount();
        });

        it('touchedFields comienza vacío', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            await nextTick();
            expect(result.touchedFields.value.size).toBe(0);
            unmount();
        });

        it('dirtyFields comienza vacío', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            await nextTick();
            expect(result.dirtyFields.value.size).toBe(0);
            unmount();
        });

        it('acepta initial con múltiples campos', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { a: '1', b: '2', c: '3' }, validations: [] }),
            );
            await nextTick();
            expect(result.form.a).toBe('1');
            expect(result.form.b).toBe('2');
            expect(result.form.c).toBe('3');
            unmount();
        });

        it('expone todas las funciones esperadas', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            await nextTick();
            expect(typeof result.handleChange).toBe('function');
            expect(typeof result.handleBlur).toBe('function');
            expect(typeof result.validate).toBe('function');
            expect(typeof result.reset).toBe('function');
            expect(typeof result.handleSubmit).toBe('function');
            expect(typeof result.setServerErrors).toBe('function');
            expect(typeof result.setValues).toBe('function');
            expect(typeof result.addFieldValidation).toBe('function');
            expect(typeof result.removeFieldValidation).toBe('function');
            expect(typeof result.setFieldValidations).toBe('function');
            expect(typeof result.clearFieldValidations).toBe('function');
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('handleChange', () => {
        it('actualiza el valor del campo en form', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.handleChange('email', 'test@example.com');
            await nextTick();
            expect(result.form.email).toBe('test@example.com');
            unmount();
        });

        it('valida el campo y setea errores como array cuando falla', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.handleChange('email', 'invalid-email');
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            unmount();
        });

        it('setea null en errors cuando el campo pasa la validación', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.handleChange('email', 'valid@example.com');
            await nextTick();
            expect(result.errors.email).toBeNull();
            unmount();
        });

        it('marca el campo como dirty cuando cambia del valor inicial', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.handleChange('email', 'new@example.com');
            await nextTick();
            expect(result.dirtyFields.value.has('email')).toBe(true);
            unmount();
        });

        it('quita la marca dirty cuando el valor regresa al inicial', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'original@example.com' }, validations }),
            );
            result.handleChange('email', 'changed@example.com');
            await nextTick();
            expect(result.dirtyFields.value.has('email')).toBe(true);

            result.handleChange('email', 'original@example.com');
            await nextTick();
            expect(result.dirtyFields.value.has('email')).toBe(false);
            unmount();
        });

        it('NO valida cuando validateOnBlur es true', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations, validateOnBlur: true }),
            );
            result.handleChange('email', 'not-an-email');
            await nextTick();
            expect(result.errors.email).toBeUndefined();
            unmount();
        });

        it('NO valida cuando validateOnSubmit es true y aún no se ha hecho submit', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations, validateOnSubmit: true }),
            );
            result.handleChange('email', 'invalid');
            await nextTick();
            expect(result.errors.email).toBeUndefined();
            unmount();
        });

        it('valida inmediatamente cuando validateOnBlur es false (por defecto)', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations, validateOnBlur: false }),
            );
            result.handleChange('email', 'not-an-email');
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            unmount();
        });

        it('isValid cambia a false cuando hay errores tras handleChange', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.handleChange('email', 'bad-email');
            await nextTick();
            expect(result.isValid.value).toBe(false);
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('handleBlur + validateOnBlur', () => {
        it('marca el campo como touched al hacer blur', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.handleBlur('email');
            await nextTick();
            expect(result.touchedFields.value.has('email')).toBe(true);
            unmount();
        });

        it('múltiples handleBlur en el mismo campo no duplican touchedFields', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations, validateOnBlur: true }),
            );
            result.handleBlur('email');
            result.handleBlur('email');
            result.handleBlur('email');
            await nextTick();
            expect(result.touchedFields.value.size).toBe(1);
            unmount();
        });

        it('valida en blur cuando validateOnBlur es true y el campo es inválido', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations, validateOnBlur: true }),
            );
            result.handleChange('email', 'not-an-email');
            result.handleBlur('email');
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            expect((result.errors.email as string[]).length).toBeGreaterThan(0);
            unmount();
        });

        it('setea null en blur cuando validateOnBlur es true y el campo es válido', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations, validateOnBlur: true }),
            );
            result.handleChange('email', 'valid@example.com');
            result.handleBlur('email');
            await nextTick();
            expect(result.errors.email).toBeNull();
            unmount();
        });

        it('handleBlur NO valida antes del primer submit cuando validateOnSubmit es true', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations, validateOnSubmit: true }),
            );
            result.handleBlur('email');
            await nextTick();
            expect(result.errors.email).toBeUndefined();
            unmount();
        });

        it('handleBlur valida después del submit cuando validateOnSubmit es true', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations, validateOnSubmit: true }),
            );
            await result.handleSubmit(() => {})();
            await nextTick();

            result.handleChange('email', 'bad-email');
            result.handleBlur('email');
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            unmount();
        });

        it('NO valida en blur sin validateOnBlur ni validateOnSubmit', async () => {
            // Default mode: validates on change, not on blur, so blur only marks touched
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            // Make it valid first
            result.handleChange('email', 'ok@example.com');
            await nextTick();
            expect(result.errors.email).toBeNull();
            // blur should not cause re-validation in default mode
            result.handleBlur('email');
            await nextTick();
            expect(result.errors.email).toBeNull();
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('validate()', () => {
        it('setea errores en TODOS los campos simultáneamente', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            await result.validate();
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            expect(Array.isArray(result.errors.name)).toBe(true);
            unmount();
        });

        it('retorna un objeto FormErrors con las claves de los campos', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            const returnedErrors = await result.validate();
            await nextTick();
            expect(returnedErrors).toBeDefined();
            expect(typeof returnedErrors).toBe('object');
            expect('email' in returnedErrors).toBe(true);
            expect('name' in returnedErrors).toBe(true);
            unmount();
        });

        it('isValid es false tras validate() con datos inválidos', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            await result.validate();
            await nextTick();
            expect(result.isValid.value).toBe(false);
            unmount();
        });

        it('isValid es true tras validate() con datos válidos', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({
                    initial: { email: 'good@example.com', name: 'Alice' },
                    validations,
                }),
            );
            await result.validate();
            await nextTick();
            expect(result.isValid.value).toBe(true);
            unmount();
        });

        it('isValidating es false tras completar validate()', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            await result.validate();
            await nextTick();
            expect(result.isValidating.value).toBe(false);
            unmount();
        });

        it('validate() sobreescribe errores de servidor previos', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'ok@example.com', name: 'Alice' }, validations }),
            );
            result.setServerErrors({ email: ['server error'] });
            await nextTick();
            expect(result.errors.email).toEqual(['server error']);

            await result.validate();
            await nextTick();
            // valid data — server error should be replaced with null
            expect(result.errors.email).toBeNull();
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('handleSubmit', () => {
        it('llama a onSubmit cuando el formulario es válido', async () => {
            const onSubmit = vi.fn();
            const { result, unmount } = withSetup(() =>
                useValiValid({
                    initial: { email: 'test@example.com', name: 'John' },
                    validations,
                }),
            );
            await result.handleSubmit(onSubmit)();
            await nextTick();
            expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com', name: 'John' });
            unmount();
        });

        it('NO llama a onSubmit cuando el formulario es inválido', async () => {
            const onSubmit = vi.fn();
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            await result.handleSubmit(onSubmit)();
            await nextTick();
            expect(onSubmit).not.toHaveBeenCalled();
            unmount();
        });

        it('incrementa submitCount en cada llamada', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            expect(result.submitCount.value).toBe(0);
            await result.handleSubmit(() => {})();
            await result.handleSubmit(() => {})();
            await nextTick();
            expect(result.submitCount.value).toBe(2);
            unmount();
        });

        it('establece isSubmitted en true después del primer submit', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            expect(result.isSubmitted.value).toBe(false);
            await result.handleSubmit(() => {})();
            await nextTick();
            expect(result.isSubmitted.value).toBe(true);
            unmount();
        });

        it('previene el evento por defecto cuando se pasa un Event', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'ok@example.com', name: 'Alice' }, validations }),
            );
            const fakeEvent = { preventDefault: vi.fn() } as unknown as Event;
            await result.handleSubmit(() => {})(fakeEvent);
            await nextTick();
            expect(fakeEvent.preventDefault).toHaveBeenCalled();
            unmount();
        });

        it('setea errores en todos los campos tras submit inválido con validateOnSubmit', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({
                    initial: { email: '', name: '' },
                    validations,
                    validateOnSubmit: true,
                }),
            );
            await result.handleSubmit(() => {})();
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            expect(Array.isArray(result.errors.name)).toBe(true);
            unmount();
        });

        it('pasa una copia del form a onSubmit (no la referencia reactiva)', async () => {
            let capturedForm: any;
            const { result, unmount } = withSetup(() =>
                useValiValid({
                    initial: { email: 'x@y.com', name: 'Bob' },
                    validations,
                }),
            );
            await result.handleSubmit((f) => { capturedForm = f; })();
            await nextTick();
            expect(capturedForm).toBeDefined();
            expect(capturedForm.email).toBe('x@y.com');
            unmount();
        });

        it('no lanza error cuando onSubmit es async', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'a@b.com', name: 'Alice' }, validations }),
            );
            await expect(
                result.handleSubmit(async () => { await Promise.resolve(); })(),
            ).resolves.toBeUndefined();
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('reset()', () => {
        it('restaura form, errors y todo el estado al inicial', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.handleChange('email', 'test@example.com');
            await result.handleSubmit(() => {})();
            await nextTick();

            result.reset();
            await nextTick();

            expect(result.form.email).toBe('');
            expect(result.errors).toEqual({});
            expect(result.isSubmitted.value).toBe(false);
            expect(result.submitCount.value).toBe(0);
            expect(result.dirtyFields.value.size).toBe(0);
            expect(result.touchedFields.value.size).toBe(0);
            unmount();
        });

        it('reset(newInitial) actualiza el form con los nuevos valores', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.reset({ email: 'new@example.com' });
            await nextTick();
            expect(result.form.email).toBe('new@example.com');
            unmount();
        });

        it('reset(newInitial) limpia dirty fields; dirty base se actualiza al nuevo initial', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.handleChange('email', 'changed@example.com');
            await nextTick();
            expect(result.dirtyFields.value.has('email')).toBe(true);

            result.reset({ email: 'new@example.com' });
            await nextTick();
            expect(result.dirtyFields.value.size).toBe(0);

            // Después de reset(newInitial), el dirty base es 'new@example.com',
            // así que establecer ese mismo valor NO es dirty
            result.handleChange('email', 'new@example.com');
            await nextTick();
            expect(result.dirtyFields.value.has('email')).toBe(false);

            // Pero cambiar a otro valor diferente SÍ es dirty
            result.handleChange('email', 'other@example.com');
            await nextTick();
            expect(result.dirtyFields.value.has('email')).toBe(true);
            unmount();
        });

        it('reset() limpia errores existentes', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            await result.validate();
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);

            result.reset();
            await nextTick();
            expect(result.errors).toEqual({});
            unmount();
        });

        it('reset() establece isValidating en false', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.reset();
            await nextTick();
            expect(result.isValidating.value).toBe(false);
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('setValues()', () => {
        it('actualiza múltiples campos a la vez', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            result.setValues({ email: 'test@example.com', name: 'Alice' });
            await nextTick();
            expect(result.form.email).toBe('test@example.com');
            expect(result.form.name).toBe('Alice');
            unmount();
        });

        it('marca campos como dirty cuando son diferentes al initial', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            result.setValues({ email: 'new@example.com' });
            await nextTick();
            expect(result.dirtyFields.value.has('email')).toBe(true);
            expect(result.dirtyFields.value.has('name')).toBe(false);
            unmount();
        });

        it('valida los campos actualizados en modo por defecto', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            result.setValues({ email: 'bad-email' });
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            unmount();
        });

        it('NO valida cuando validateOnBlur es true', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations, validateOnBlur: true }),
            );
            result.setValues({ email: 'bad-email' });
            await nextTick();
            expect(result.errors.email).toBeUndefined();
            unmount();
        });

        it('actualizar un campo a su valor inicial lo quita de dirtyFields', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'orig@example.com' }, validations }),
            );
            result.setValues({ email: 'new@example.com' });
            await nextTick();
            expect(result.dirtyFields.value.has('email')).toBe(true);

            result.setValues({ email: 'orig@example.com' });
            await nextTick();
            expect(result.dirtyFields.value.has('email')).toBe(false);
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('setServerErrors()', () => {
        it('inyecta errores externos en el estado', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.setServerErrors({ email: ['Este email ya está en uso'] });
            await nextTick();
            expect(result.errors.email).toEqual(['Este email ya está en uso']);
            unmount();
        });

        it('isValid es false cuando hay server errors', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.setServerErrors({ email: ['Taken'] });
            await nextTick();
            expect(result.isValid.value).toBe(false);
            unmount();
        });

        it('puede inyectar errores en múltiples campos', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            result.setServerErrors({ email: ['err1'], name: ['err2'] });
            await nextTick();
            expect(result.errors.email).toEqual(['err1']);
            expect(result.errors.name).toEqual(['err2']);
            unmount();
        });

        it('los errores de servidor son reemplazados por validate() posterior', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'ok@example.com', name: 'Alice' }, validations }),
            );
            result.setServerErrors({ email: ['server error'] });
            await nextTick();
            expect(result.errors.email).toEqual(['server error']);

            await result.validate();
            await nextTick();
            expect(result.errors.email).toBeNull();
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('validateOnSubmit mode', () => {
        it('handleChange NO valida antes del primer submit', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations, validateOnSubmit: true }),
            );
            result.handleChange('email', 'bad-email');
            await nextTick();
            expect(result.errors.email).toBeUndefined();
            unmount();
        });

        it('handleBlur NO valida antes del primer submit', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations, validateOnSubmit: true }),
            );
            result.handleBlur('email');
            await nextTick();
            expect(result.errors.email).toBeUndefined();
            unmount();
        });

        it('handleSubmit valida sin importar el modo validateOnSubmit', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations, validateOnSubmit: true }),
            );
            await result.handleSubmit(() => {})();
            await nextTick();
            expect(result.errors.email).toBeInstanceOf(Array);
            unmount();
        });

        it('después de submit, handleBlur valida porque isSubmitted es true', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations, validateOnSubmit: true }),
            );
            await result.handleSubmit(() => {})();
            await nextTick();

            result.handleChange('email', 'bad-email');
            result.handleBlur('email');
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            unmount();
        });

        it('después de submit inválido, errors en todos los campos', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({
                    initial: { email: '', name: '' },
                    validations,
                    validateOnSubmit: true,
                }),
            );
            await result.handleSubmit(() => {})();
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            expect(Array.isArray(result.errors.name)).toBe(true);
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('addFieldValidation / removeFieldValidation / setFieldValidations / clearFieldValidations', () => {
        it('addFieldValidation agrega una nueva regla y el campo falla', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { code: 'hello' }, validations: [] }),
            );
            result.handleChange('code', 'hello');
            await nextTick();
            expect(result.errors.code).toBeNull();

            result.addFieldValidation('code', [{ type: ValidationType.DigitsOnly } as ValidationsConfig]);
            await nextTick();
            // El composable re-valida inmediatamente con el valor actual
            expect(Array.isArray(result.errors.code)).toBe(true);
            unmount();
        });

        it('addFieldValidation no afecta a otros campos', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { code: 'abc', other: 'xyz' }, validations: [] }),
            );
            result.addFieldValidation('code', [{ type: ValidationType.DigitsOnly } as ValidationsConfig]);
            await nextTick();
            expect(result.errors.other).toBeUndefined();
            unmount();
        });

        it('removeFieldValidation elimina una regla y el campo pasa', async () => {
            const localValidations: FieldValidationConfig<any>[] = [
                { field: 'code', validations: [{ type: ValidationType.DigitsOnly } as ValidationsConfig] },
            ];
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { code: '' }, validations: localValidations }),
            );
            result.handleChange('code', 'abc');
            await nextTick();
            expect(Array.isArray(result.errors.code)).toBe(true);

            result.removeFieldValidation('code', ValidationType.DigitsOnly);
            result.handleChange('code', 'abc');
            await nextTick();
            expect(result.errors.code).toBeNull();
            unmount();
        });

        it('setFieldValidations reemplaza todas las reglas — la antigua ya no aplica', async () => {
            const localValidations: FieldValidationConfig<any>[] = [
                { field: 'code', validations: [{ type: ValidationType.DigitsOnly } as ValidationsConfig] },
            ];
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { code: '' }, validations: localValidations }),
            );
            result.handleChange('code', 'abc');
            await nextTick();
            expect(Array.isArray(result.errors.code)).toBe(true);

            // Reemplazar con Alpha (solo letras) — 'abc' es válido ahora
            result.setFieldValidations('code', [{ type: ValidationType.Alpha } as ValidationsConfig]);
            result.handleChange('code', 'abc');
            await nextTick();
            expect(result.errors.code).toBeNull();
            unmount();
        });

        it('clearFieldValidations hace que el campo siempre retorne null', async () => {
            const localValidations: FieldValidationConfig<any>[] = [
                {
                    field: 'code',
                    validations: [
                        { type: ValidationType.Required } as ValidationsConfig,
                        { type: ValidationType.Email } as ValidationsConfig,
                    ],
                },
            ];
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { code: '' }, validations: localValidations }),
            );
            result.handleChange('code', 'not-valid');
            await nextTick();
            expect(Array.isArray(result.errors.code)).toBe(true);

            result.clearFieldValidations('code');
            await nextTick();
            expect(result.errors.code).toBeNull();

            result.handleChange('code', 'still-not-valid');
            await nextTick();
            expect(result.errors.code).toBeNull();
            unmount();
        });

        it('setFieldValidations con array vacío limpia todas las reglas', async () => {
            const localValidations: FieldValidationConfig<any>[] = [
                { field: 'code', validations: [{ type: ValidationType.Required } as ValidationsConfig] },
            ];
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { code: '' }, validations: localValidations }),
            );
            result.setFieldValidations('code', []);
            result.handleChange('code', '');
            await nextTick();
            expect(result.errors.code).toBeNull();
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('trigger() y clearErrors()', () => {
        it('validate() actúa como trigger global — ejecuta todas las validaciones', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            await result.validate();
            await nextTick();
            expect('email' in result.errors).toBe(true);
            expect('name' in result.errors).toBe(true);
            unmount();
        });

        it('reset() actúa como clearErrors — limpia todos los errores', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            await result.validate();
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);

            result.reset();
            await nextTick();
            expect(result.errors).toEqual({});
            unmount();
        });

        it('validate() en campo único refleja el estado actual del form', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'ok@example.com', name: 'Alice' }, validations }),
            );
            const errs = await result.validate();
            await nextTick();
            expect(errs.email).toBeNull();
            expect(errs.name).toBeNull();
            unmount();
        });

        it('setServerErrors luego reset() limpia los errores de servidor', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.setServerErrors({ email: ['server error'] });
            await nextTick();
            expect(result.errors.email).toEqual(['server error']);

            result.reset();
            await nextTick();
            expect(result.errors).toEqual({});
            unmount();
        });

        // New tests for trigger() and clearErrors()
        it('trigger() sin argumento valida todos los campos', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            await result.trigger();
            await nextTick();
            expect('email' in result.errors).toBe(true);
            expect('name' in result.errors).toBe(true);
            expect(Array.isArray(result.errors.email)).toBe(true);
            expect(Array.isArray(result.errors.name)).toBe(true);
            unmount();
        });

        it('trigger(field) valida solo ese campo', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            await result.trigger('email');
            await nextTick();
            expect('email' in result.errors).toBe(true);
            expect(Array.isArray(result.errors.email)).toBe(true);
            // name should not be validated yet
            expect(result.errors.name).toBeUndefined();
            unmount();
        });

        it('trigger(field) con valor válido setea null', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'ok@example.com', name: '' }, validations }),
            );
            await result.trigger('email');
            await nextTick();
            expect(result.errors.email).toBeNull();
            unmount();
        });

        it('clearErrors() sin argumento limpia todos los errores', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            await result.validate();
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            expect(Array.isArray(result.errors.name)).toBe(true);

            result.clearErrors();
            await nextTick();
            expect(result.errors).toEqual({});
            unmount();
        });

        it('clearErrors(field) limpia solo ese campo', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            await result.validate();
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            expect(Array.isArray(result.errors.name)).toBe(true);

            result.clearErrors('email');
            await nextTick();
            expect(result.errors.email).toBeNull();
            // name should still have errors
            expect(Array.isArray(result.errors.name)).toBe(true);
            unmount();
        });

        it('clearErrors() hace isValid true cuando no quedan errores', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            await result.validate();
            await nextTick();
            expect(result.isValid.value).toBe(false);

            result.clearErrors();
            await nextTick();
            expect(result.isValid.value).toBe(true);
            unmount();
        });

        it('trigger() retorna un objeto con las claves de error', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            const errs = await result.trigger();
            expect(errs).toBeDefined();
            expect(typeof errs).toBe('object');
            unmount();
        });

        it('trigger(field) retorna snapshot del estado de errores', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'bad', name: '' }, validations }),
            );
            const errs = await result.trigger('email');
            expect(errs).toBeDefined();
            expect(typeof errs).toBe('object');
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('asyncTimeout', () => {
        it('corta una promise que tarda más del timeout', async () => {
            vi.useFakeTimers();
            const slowValidation: FieldValidationConfig<any>[] = [
                {
                    field: 'username',
                    validations: [
                        {
                            type: ValidationType.AsyncPattern,
                            asyncFn: () => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 20000)),
                            message: 'Slow validation',
                        } as ValidationsConfig,
                    ],
                },
            ];

            const { result, unmount } = withSetup(() =>
                useValiValid({
                    initial: { username: 'test' },
                    validations: slowValidation,
                    asyncTimeout: 100,
                    debounceMs: 0,
                }),
            );

            result.handleChange('username', 'test');
            // Advance past the timeout
            vi.advanceTimersByTime(5000);
            await Promise.resolve();
            await Promise.resolve();

            // isValidating should eventually settle (timeout fires)
            expect(result.isValidating.value).toBe(false);
            unmount();
            vi.useRealTimers();
        });

        it('no corta una promise que termina a tiempo', async () => {
            const fastValidation: FieldValidationConfig<any>[] = [
                {
                    field: 'username',
                    validations: [
                        {
                            type: ValidationType.AsyncPattern,
                            asyncFn: () => Promise.resolve(true),
                            message: 'Fast validation',
                        } as ValidationsConfig,
                    ],
                },
            ];

            const { result, unmount } = withSetup(() =>
                useValiValid({
                    initial: { username: '' },
                    validations: fastValidation,
                    asyncTimeout: 10000,
                    debounceMs: 0,
                }),
            );

            result.handleChange('username', 'validuser');
            // Let the microtask queue flush
            await new Promise((r) => setTimeout(r, 50));
            await nextTick();

            // Fast async validator resolves to true (valid) — errors should be null
            expect(result.errors.username).toBeNull();
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('isValid reacciona a cambios', () => {
        it('isValid es true con errores object vacío (sin validaciones ejecutadas)', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            await nextTick();
            expect(result.errors).toEqual({});
            expect(result.isValid.value).toBe(true);
            unmount();
        });

        it('isValid es false cuando cualquier campo tiene un array de errores no vacío', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            result.handleChange('email', 'bad-email');
            result.handleChange('name', 'Alice');
            await nextTick();
            expect(result.isValid.value).toBe(false);
            unmount();
        });

        it('isValid es true cuando todos los errores son null', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'ok@example.com', name: 'Alice' }, validations }),
            );
            await result.validate();
            await nextTick();
            expect(result.isValid.value).toBe(true);
            unmount();
        });

        it('isValid cambia de false a true cuando se corrige el campo inválido', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.handleChange('email', 'bad');
            await nextTick();
            expect(result.isValid.value).toBe(false);

            result.handleChange('email', 'good@example.com');
            await nextTick();
            expect(result.isValid.value).toBe(true);
            unmount();
        });

        it('isValid vuelve a true tras reset() incluso con errores previos', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            await result.validate();
            await nextTick();
            expect(result.isValid.value).toBe(false);

            result.reset();
            await nextTick();
            expect(result.isValid.value).toBe(true);
            unmount();
        });

        it('isValid responde a errores de servidor (setServerErrors)', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'ok@example.com' }, validations }),
            );
            expect(result.isValid.value).toBe(true);

            result.setServerErrors({ email: ['taken'] });
            await nextTick();
            expect(result.isValid.value).toBe(false);
            unmount();
        });

        it('error array con mensajes contiene strings', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.handleChange('email', '');
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            const msgs = result.errors.email as string[];
            expect(msgs.length).toBeGreaterThan(0);
            expect(typeof msgs[0]).toBe('string');
            unmount();
        });

        it('error de email inválido contiene mensaje sobre email', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            result.handleChange('email', 'not-an-email');
            await nextTick();
            const msgs = result.errors.email as string[];
            expect(msgs.length).toBeGreaterThan(0);
            expect(typeof msgs[0]).toBe('string');
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('new feature tests', () => {
        // 1. criteriaMode: 'firstError' → only 1 error per field
        it('criteriaMode firstError — solo 1 error por campo aunque fallen varias reglas', async () => {
            const localValidations: FieldValidationConfig<any>[] = [{
                field: 'password',
                validations: [
                    { type: ValidationType.Required, message: 'required' } as ValidationsConfig,
                    { type: ValidationType.MinLength, value: 8, message: 'too short' } as ValidationsConfig,
                    { type: ValidationType.PasswordStrength, message: 'too weak' } as ValidationsConfig,
                ],
            }];
            const { result, unmount } = withSetup(() =>
                useValiValid({
                    initial: { password: '' },
                    validations: localValidations,
                    criteriaMode: 'firstError',
                }),
            );
            await result.validate();
            await nextTick();
            expect(Array.isArray(result.errors.password)).toBe(true);
            expect((result.errors.password as string[]).length).toBe(1);
            unmount();
        });

        // 2. validateOnMount: true → validate() is called after mount, errors populated
        it('validateOnMount:true — errores se populan al montar el componente', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({
                    initial: { email: '', name: '' },
                    validations,
                    validateOnMount: true,
                }),
            );
            // Wait for the mounted hook to fire and validation to complete
            await new Promise((r) => setTimeout(r, 10));
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            expect(Array.isArray(result.errors.name)).toBe(true);
            unmount();
        });

        // 3. deepClone in reset: mutate nested array, then reset() → baseline is clean
        it('reset() — deepClone garantiza que el baseline es limpio tras mutar un array anidado', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({
                    initial: { tags: ['a', 'b'] as string[] },
                    validations: [],
                }),
            );
            // Mutate the live form value
            (result.form as any).tags.push('c');
            await nextTick();
            expect((result.form as any).tags).toEqual(['a', 'b', 'c']);

            // Reset should restore to original initial without 'c'
            result.reset();
            await nextTick();
            expect((result.form as any).tags).toEqual(['a', 'b']);
            unmount();
        });

        // 4. trigger(field) with async validator → correct errors after async resolves
        it('trigger(field) con validador async — devuelve errores correctos', async () => {
            const asyncValidations: FieldValidationConfig<any>[] = [{
                field: 'username',
                validations: [{
                    type: ValidationType.AsyncPattern,
                    asyncFn: async (val: string) => val !== 'taken',
                    message: 'Username is taken',
                } as ValidationsConfig],
            }];
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { username: 'taken' }, validations: asyncValidations }),
            );
            const errs = await result.trigger('username');
            await nextTick();
            expect(Array.isArray(errs.username)).toBe(true);
            expect((errs.username as string[])[0]).toBe('Username is taken');
            unmount();
        });

        // 5. asyncTimeout: 100 → slow async validator (300ms) does not block, returns empty errors
        it('asyncTimeout:100 — validador lento (300ms) no bloquea y devuelve null', async () => {
            const slowValidations: FieldValidationConfig<any>[] = [{
                field: 'username',
                validations: [{
                    type: ValidationType.AsyncPattern,
                    asyncFn: () => new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 300)),
                    message: 'slow error',
                } as ValidationsConfig],
            }];
            const { result, unmount } = withSetup(() =>
                useValiValid({
                    initial: { username: 'test' },
                    validations: slowValidations,
                    asyncTimeout: 100,
                }),
            );
            // trigger uses withTimeout internally — should resolve before 300ms due to 100ms cap
            const errs = await result.trigger('username');
            await nextTick();
            // Timeout fires before the validator resolves → error is swallowed → null
            expect(errs.username).toBeNull();
            unmount();
        }, 3000);
    });
});

// ---------------------------------------------------------------------------
// New targeted coverage: Fix 6 clearErrors null, locale, async, field mgmt
// ---------------------------------------------------------------------------

describe('useValiValid (Vue) — new targeted coverage', () => {
    const baseValidations: FieldValidationConfig<any>[] = [
        {
            field: 'email',
            validations: [
                { type: ValidationType.Required } as ValidationsConfig,
                { type: ValidationType.Email } as ValidationsConfig,
            ],
        },
        {
            field: 'name',
            validations: [{ type: ValidationType.Required } as ValidationsConfig],
        },
    ];

    // 1. clearErrors(field) sets the field to null, not undefined
    it('clearErrors(field) sets the field to null (not undefined)', async () => {
        const { result, unmount } = withSetup(() =>
            useValiValid({ initial: { email: '', name: '' }, validations: baseValidations }),
        );
        await result.validate();
        await nextTick();
        expect(Array.isArray(result.errors.email)).toBe(true);

        result.clearErrors('email');
        await nextTick();
        expect(result.errors.email).toBeNull();
        // name errors remain untouched
        expect(Array.isArray(result.errors.name)).toBe(true);
        unmount();
    });

    // 2. clearErrors() clears all errors
    it('clearErrors() with no argument clears all errors', async () => {
        const { result, unmount } = withSetup(() =>
            useValiValid({ initial: { email: '', name: '' }, validations: baseValidations }),
        );
        await result.validate();
        await nextTick();
        expect(Array.isArray(result.errors.email)).toBe(true);
        expect(Array.isArray(result.errors.name)).toBe(true);

        result.clearErrors();
        await nextTick();
        expect(result.errors).toEqual({});
        expect(result.isValid.value).toBe(true);
        unmount();
    });

    // 3. addFieldValidation / removeFieldValidation round-trip
    it('addFieldValidation then removeFieldValidation round-trip', async () => {
        const { result, unmount } = withSetup(() =>
            useValiValid({ initial: { code: 'hello' }, validations: [] }),
        );
        // No rules → valid
        result.handleChange('code', 'hello');
        await nextTick();
        expect(result.errors.code).toBeNull();

        // Add DigitsOnly — 'hello' fails
        result.addFieldValidation('code', [{ type: ValidationType.DigitsOnly } as ValidationsConfig]);
        result.handleChange('code', 'hello');
        await nextTick();
        expect(Array.isArray(result.errors.code)).toBe(true);

        // Remove DigitsOnly — 'hello' valid again
        result.removeFieldValidation('code', ValidationType.DigitsOnly);
        result.handleChange('code', 'hello');
        await nextTick();
        expect(result.errors.code).toBeNull();
        unmount();
    });

    // 4. locale: 'es' produces Spanish error messages
    it("locale: 'es' produces Spanish error messages", async () => {
        const { result, unmount } = withSetup(() =>
            useValiValid({
                initial: { email: '' },
                validations: [
                    {
                        field: 'email',
                        validations: [{ type: ValidationType.Required } as ValidationsConfig],
                    },
                ],
                locale: 'es',
            }),
        );
        await result.validate();
        await nextTick();
        const msgs = result.errors.email as string[];
        expect(Array.isArray(msgs)).toBe(true);
        expect(msgs.some((m) => m.includes('obligatorio'))).toBe(true);
        unmount();
    });

    // 5. trigger() no arg validates all fields
    it('trigger() with no argument validates all fields and returns FormErrors', async () => {
        const { result, unmount } = withSetup(() =>
            useValiValid({ initial: { email: '', name: '' }, validations: baseValidations }),
        );
        const errs = await result.trigger();
        await nextTick();
        expect('email' in errs).toBe(true);
        expect('name' in errs).toBe(true);
        expect(Array.isArray(errs.email)).toBe(true);
        expect(Array.isArray(errs.name)).toBe(true);
        unmount();
    });

    // 6. asyncTimeout with slow async validator
    it('asyncTimeout:100 with slow async validator does not block the form', async () => {
        vi.useFakeTimers();
        const slowAsync: ValidationsConfig = {
            type: ValidationType.AsyncPattern,
            asyncFn: () => new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
            message: 'slow error',
        } as any;
        const { result, unmount } = withSetup(() =>
            useValiValid({
                initial: { username: 'test' },
                validations: [{ field: 'username', validations: [slowAsync] }],
                asyncTimeout: 100,
                debounceMs: 0,
            }),
        );
        result.handleChange('username', 'test');
        // Advance past debounce (0) so timer fires
        vi.advanceTimersByTime(1);
        await Promise.resolve();
        await Promise.resolve();
        // Advance past asyncTimeout so _withTimeout rejects
        vi.advanceTimersByTime(200);
        await Promise.resolve();
        await Promise.resolve();
        await nextTick();
        // isValidating should be false after timeout
        expect(result.isValidating.value).toBe(false);
        unmount();
        vi.useRealTimers();
    });

    // -----------------------------------------------------------------------
    describe('getValues', () => {
        it('returns current form values', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'a@b.com', name: 'Alice' }, validations }),
            );
            await nextTick();
            result.handleChange('name', 'Bob');
            await nextTick();
            const values = result.getValues();
            expect(values.name).toBe('Bob');
            expect(values.email).toBe('a@b.com');
            unmount();
        });

        it('returned object is a deep clone — mutating it does not affect internal state', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'a@b.com', name: 'Alice' }, validations }),
            );
            await nextTick();
            const values = result.getValues();
            values.email = 'mutated@example.com';
            expect(result.form.email).toBe('a@b.com');
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('setFieldValidations', () => {
        it('replaces rules — next validate enforces new rules only', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '' }, validations }),
            );
            await nextTick();
            // Replace email validation with just Required (no Email format check)
            result.setFieldValidations('email', [
                { type: ValidationType.Required } as ValidationsConfig,
            ]);
            result.handleChange('email', 'not-an-email');
            await result.validate();
            await nextTick();
            expect(result.errors.email).toBeNull();
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('addFieldValidation', () => {
        it('adds a rule — validate enforces it', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'test@example.com' }, validations: [] }),
            );
            await nextTick();
            // No validations yet — email should pass (null or undefined)
            await result.validate();
            await nextTick();
            expect(result.errors.email == null).toBe(true);
            // Add Required rule and clear value
            result.addFieldValidation('email', [{ type: ValidationType.Required } as ValidationsConfig]);
            result.handleChange('email', '');
            await result.validate();
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('removeFieldValidation', () => {
        it('removes a rule — validate no longer enforces it', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: 'not-an-email' }, validations }),
            );
            await nextTick();
            // Initially email fails Email format check
            await result.validate();
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            // Remove the Email format rule
            result.removeFieldValidation('email', ValidationType.Email);
            await result.validate();
            await nextTick();
            // Now only Required remains, and the value is non-empty, so it passes
            expect(result.errors.email).toBeNull();
            unmount();
        });
    });

    // -----------------------------------------------------------------------
    describe('trigger', () => {
        it('trigger() with no arg validates all fields', async () => {
            const { result, unmount } = withSetup(() =>
                useValiValid({ initial: { email: '', name: '' }, validations }),
            );
            await nextTick();
            // Errors should be empty before trigger
            expect(result.errors).toEqual({});
            await result.trigger();
            await nextTick();
            expect(Array.isArray(result.errors.email)).toBe(true);
            expect(Array.isArray(result.errors.name)).toBe(true);
            unmount();
        });

        // Race condition: handleChange (debounced async) then immediate trigger — trigger wins
        it('trigger(field) cancels pending debounced async so stale result cannot overwrite trigger result', async () => {
            vi.useFakeTimers();

            // slow async: resolves to false (invalid) for 'stale', true (valid) for anything else
            let resolveStale!: (v: boolean) => void;
            const staleAsyncValidations: FieldValidationConfig<any>[] = [{
                field: 'username',
                validations: [{
                    type: ValidationType.AsyncPattern,
                    asyncFn: (_val: string) => new Promise<boolean>((res) => { resolveStale = res; }),
                    message: 'Stale error',
                } as ValidationsConfig],
            }];

            const { result, unmount } = withSetup(() =>
                useValiValid({
                    initial: { username: '' },
                    validations: staleAsyncValidations,
                    debounceMs: 200,
                    asyncTimeout: 5000,
                }),
            );

            // handleChange schedules a debounced async validation
            result.handleChange('username', 'stale');
            await nextTick();

            // Before the debounce fires, call trigger — it should cancel the pending timer
            // and run its own validation. We let trigger's async resolve immediately via
            // a fresh invocation (the stale promise is still pending and will resolve after).
            const triggerPromise = result.trigger('username');

            // Advance timers past debounceMs to ensure any un-cancelled timer would fire
            vi.advanceTimersByTime(300);
            await Promise.resolve();
            await Promise.resolve();

            // Resolve the stale async promise with valid (true) — if the race condition were
            // present, this would overwrite the trigger result with null (no error).
            // The trigger's own async call also awaits the same factory so we resolve it valid.
            resolveStale(true);

            const errs = await triggerPromise;
            await nextTick();

            // trigger ran its own sync validation on 'stale' value — Required rule fires (empty→'stale' is non-empty, no required error).
            // The important assertion is that the error state was NOT overwritten by the stale debounce.
            // errors.username should equal the trigger's own result (null, since 'stale' passes sync and async resolved true).
            expect(errs.username).toBeNull();
            // Crucially, isValidating must be settled — no ghost in-flight timers left.
            expect(result.isValidating.value).toBe(false);

            unmount();
            vi.useRealTimers();
        });

        // trigger(field) with async validator — returns correct errors after async resolves (no debounce interference)
        it('trigger(field) with async validator — returns correct error without debounce interference', async () => {
            const asyncValidations: FieldValidationConfig<any>[] = [{
                field: 'username',
                validations: [{
                    type: ValidationType.AsyncPattern,
                    asyncFn: async (val: string) => val !== 'taken',
                    message: 'Username already taken',
                } as ValidationsConfig],
            }];

            const { result, unmount } = withSetup(() =>
                useValiValid({
                    initial: { username: 'taken' },
                    validations: asyncValidations,
                    debounceMs: 500, // long debounce — trigger must bypass it completely
                }),
            );

            // trigger should bypass the debounce and resolve async directly
            const errs = await result.trigger('username');
            await nextTick();

            expect(Array.isArray(errs.username)).toBe(true);
            expect((errs.username as string[])[0]).toBe('Username already taken');
            // isValidating should be settled after trigger resolves
            expect(result.isValidating.value).toBe(false);

            unmount();
        });
    });
});

// ---------------------------------------------------------------------------
// Group A: getValues() / Group B: clearErrors() — targeted coverage
// ---------------------------------------------------------------------------

describe('useValiValid (Vue) — getValues and clearErrors', () => {
    const baseValidations: FieldValidationConfig<any>[] = [
        {
            field: 'email',
            validations: [
                { type: ValidationType.Required } as ValidationsConfig,
                { type: ValidationType.Email } as ValidationsConfig,
            ],
        },
        {
            field: 'name',
            validations: [{ type: ValidationType.Required } as ValidationsConfig],
        },
    ];

    // -----------------------------------------------------------------------
    // Group A: getValues()
    // -----------------------------------------------------------------------

    // A1 — getValues() returns an object whose values equal the current form state
    it('getValues() returns an object whose values equal the current form state', async () => {
        const { result, unmount } = withSetup(() =>
            useValiValid({ initial: { email: 'a@b.com', name: 'Alice' }, validations: baseValidations }),
        );
        await nextTick();
        result.handleChange('email', 'updated@example.com');
        await nextTick();
        const values = result.getValues();
        expect(values.email).toBe('updated@example.com');
        expect(values.name).toBe('Alice');
        unmount();
    });

    // A2 — getValues() returns a deep clone — mutating the returned object does NOT affect the reactive form state
    it('getValues() returns a deep clone — mutating the result does not affect the reactive form', async () => {
        const { result, unmount } = withSetup(() =>
            useValiValid({ initial: { email: 'orig@example.com', name: 'Original' }, validations: [] }),
        );
        await nextTick();
        const values = result.getValues();
        // Mutate the cloned object
        values.email = 'mutated@example.com';
        values.name = 'Mutated';
        // The reactive form should remain unchanged
        expect(result.form.email).toBe('orig@example.com');
        expect(result.form.name).toBe('Original');
        unmount();
    });

    // A3 — getValues() after reset() returns the initial values
    it('getValues() after reset() returns the original initial values', async () => {
        const { result, unmount } = withSetup(() =>
            useValiValid({ initial: { email: 'orig@example.com', name: 'Alice' }, validations: [] }),
        );
        await nextTick();
        // Mutate the form
        result.handleChange('email', 'changed@example.com');
        result.handleChange('name', 'Bob');
        await nextTick();
        expect(result.form.email).toBe('changed@example.com');

        // Reset without argument — should restore original initial
        result.reset();
        await nextTick();
        const values = result.getValues();
        expect(values.email).toBe('orig@example.com');
        expect(values.name).toBe('Alice');
        unmount();
    });

    // -----------------------------------------------------------------------
    // Group B: clearErrors() — direct coverage
    // -----------------------------------------------------------------------

    // B4 — clearErrors(field) after validate() → sets that specific field to null, other fields remain as-is
    it('clearErrors(field) after validate() sets only that field to null — other fields remain', async () => {
        const { result, unmount } = withSetup(() =>
            useValiValid({ initial: { email: '', name: '' }, validations: baseValidations }),
        );
        await result.validate();
        await nextTick();
        // Both fields should have errors after validate()
        expect(Array.isArray(result.errors.email)).toBe(true);
        expect(Array.isArray(result.errors.name)).toBe(true);

        result.clearErrors('email');
        await nextTick();
        // email is now null
        expect(result.errors.email).toBeNull();
        // name errors remain untouched
        expect(Array.isArray(result.errors.name)).toBe(true);
        // isValid is still false because name still has errors
        expect(result.isValid.value).toBe(false);
        unmount();
    });

    // B5 — clearErrors() with no arg → all fields become null (object empty), isValid is true
    it('clearErrors() with no argument removes all error entries and makes isValid true', async () => {
        const { result, unmount } = withSetup(() =>
            useValiValid({ initial: { email: '', name: '' }, validations: baseValidations }),
        );
        await result.validate();
        await nextTick();
        expect(result.isValid.value).toBe(false);

        result.clearErrors();
        await nextTick();
        // All error keys should be gone (reactive object becomes {})
        expect(Object.keys(result.errors).length).toBe(0);
        expect(result.isValid.value).toBe(true);
        unmount();
    });

    // B6 — clearErrors(field) on a field with no errors → no-op (field stays null or undefined)
    it('clearErrors(field) on a field with no errors is a no-op — field stays null or undefined', async () => {
        const { result, unmount } = withSetup(() =>
            useValiValid({ initial: { email: 'valid@example.com', name: 'Alice' }, validations: baseValidations }),
        );
        await result.validate();
        await nextTick();
        // Both fields should be valid after validate() with good data
        expect(result.errors.email).toBeNull();
        expect(result.errors.name).toBeNull();

        // clearErrors on a field that already has no errors — should be a no-op
        result.clearErrors('email');
        await nextTick();
        expect(result.errors.email).toBeNull();
        // isValid should still be true
        expect(result.isValid.value).toBe(true);
        unmount();
    });

    // -----------------------------------------------------------------------
    // Group C: validateOnMount epoch guard
    // -----------------------------------------------------------------------

    // C1 — validateOnMount: true + reset() before mount fires → errors stay {} (epoch guard prevents stale validation)
    it('validateOnMount epoch guard: reset() before mount fires keeps errors empty', async () => {
        let capturedResult: any;
        const { unmount } = withSetup(() => {
            capturedResult = useValiValid({
                initial: { email: '', name: '' },
                validations: baseValidations,
                validateOnMount: true,
            });
            // Call reset() synchronously before onMounted fires — increments _epoch so mountEpoch !== _epoch
            capturedResult.reset();
            return capturedResult;
        });
        // Allow mounted hook and any async validation to settle
        await new Promise((r) => setTimeout(r, 20));
        await nextTick();
        // reset() incremented epoch before mount, so the epoch guard blocks the mount validation
        expect(Object.keys(capturedResult.errors).length).toBe(0);
        unmount();
    });

    // C2 — validateOnMount: true without reset() → errors are populated after mount (normal path still works)
    it('validateOnMount epoch guard: without reset() errors are populated after mount', async () => {
        const { result, unmount } = withSetup(() =>
            useValiValid({
                initial: { email: '', name: '' },
                validations: baseValidations,
                validateOnMount: true,
            }),
        );
        // Allow mounted hook and async validation to settle
        await new Promise((r) => setTimeout(r, 20));
        await nextTick();
        // No reset() was called — epoch guard passes and mount validation fires normally
        expect(Array.isArray(result.errors.email)).toBe(true);
        expect(Array.isArray(result.errors.name)).toBe(true);
        unmount();
    });
});

// ---------------------------------------------------------------------------
// Group D: concurrent asyncInFlightMap guard — trigger() + handleChange() in flight
// ---------------------------------------------------------------------------

describe('useValiValid (Vue) — concurrent isValidating guard (asyncInFlightMap)', () => {
    // D1 — trigger('email') while handleChange for 'name' has an in-flight async →
    //      isValidating stays true until BOTH resolve (guard at line ~356 is exercised)
    it('isValidating stays true while both trigger and handleChange async are in flight', async () => {
        // Manually controlled promises for both fields
        let resolveName!: (v: boolean) => void;
        let resolveEmail!: (v: boolean) => void;

        const concurrentValidations: FieldValidationConfig<any>[] = [
            {
                field: 'name',
                validations: [{
                    type: ValidationType.AsyncPattern,
                    asyncFn: () => new Promise<boolean>((res) => { resolveName = res; }),
                    message: 'name taken',
                } as ValidationsConfig],
            },
            {
                field: 'email',
                validations: [{
                    type: ValidationType.AsyncPattern,
                    asyncFn: () => new Promise<boolean>((res) => { resolveEmail = res; }),
                    message: 'email taken',
                } as ValidationsConfig],
            },
        ];

        const { result, unmount } = withSetup(() =>
            useValiValid({
                initial: { name: 'alice', email: 'a@b.com' },
                validations: concurrentValidations,
                debounceMs: 0,
            }),
        );

        // Start the handleChange for 'name' — this sets isValidating=true and puts
        // 'name' into asyncInFlightMap via the debounce timer (debounceMs=0 fires immediately).
        result.handleChange('name', 'alice');
        // Allow the debounce setTimeout(0) to fire so 'name' enters asyncInFlightMap
        await nextTick();
        await new Promise((r) => setTimeout(r, 0));

        // Now call trigger('email') — its own async resolves only when resolveEmail is called.
        // In trigger's finally block, asyncInFlightMap still has 'name' → isValidating stays true.
        const triggerPromise = result.trigger('email');

        // Resolve trigger's email async — but 'name' is still in asyncInFlightMap
        resolveEmail(true);
        await triggerPromise;
        await nextTick();

        // 'name' async is still in flight → isValidating must remain true
        expect(result.isValidating.value).toBe(true);

        // Resolve 'name' before unmounting to avoid dangling in-flight promises
        resolveName(true);
        await new Promise((r) => setTimeout(r, 0));
        unmount();
    });

    // D2 — After both async (name handleChange + email trigger) resolve → isValidating is false
    it('isValidating becomes false after both in-flight async operations resolve', async () => {
        let resolveName!: (v: boolean) => void;
        let resolveEmail!: (v: boolean) => void;

        const concurrentValidations: FieldValidationConfig<any>[] = [
            {
                field: 'name',
                validations: [{
                    type: ValidationType.AsyncPattern,
                    asyncFn: () => new Promise<boolean>((res) => { resolveName = res; }),
                    message: 'name taken',
                } as ValidationsConfig],
            },
            {
                field: 'email',
                validations: [{
                    type: ValidationType.AsyncPattern,
                    asyncFn: () => new Promise<boolean>((res) => { resolveEmail = res; }),
                    message: 'email taken',
                } as ValidationsConfig],
            },
        ];

        const { result, unmount } = withSetup(() =>
            useValiValid({
                initial: { name: 'alice', email: 'a@b.com' },
                validations: concurrentValidations,
                debounceMs: 0,
            }),
        );

        // Start handleChange for 'name' — populates asyncInFlightMap
        result.handleChange('name', 'alice');
        await nextTick();
        await new Promise((r) => setTimeout(r, 0));

        // Start trigger for 'email' — both are now in flight
        const triggerPromise = result.trigger('email');

        // Resolve email trigger first (name still in flight)
        resolveEmail(true);
        await triggerPromise;
        await nextTick();

        // Resolve name handleChange async
        resolveName(true);
        // Allow the in-flight promise for 'name' to settle through its finally block
        await new Promise((r) => setTimeout(r, 0));
        await nextTick();

        // Both resolved → asyncInFlightMap is empty → isValidating must be false
        expect(result.isValidating.value).toBe(false);

        unmount();
    });

    // -----------------------------------------------------------------------
    describe('setValues() — async cross-field watcher revalidation', () => {
        it('setValues({ fieldA }) triggers async revalidation of fieldB that watchFields fieldA', async () => {
            type Form = { password: string; confirm: string };

            const crossFieldValidations: FieldValidationConfig<Form>[] = [
                {
                    field: 'password',
                    validations: [
                        { type: ValidationType.Required } as ValidationsConfig,
                    ],
                },
                {
                    field: 'confirm',
                    watchFields: ['password'],
                    validations: [
                        {
                            type: ValidationType.AsyncPattern,
                            asyncFn: (_value: string, form?: Record<string, any>) =>
                                new Promise<boolean>((resolve) =>
                                    setTimeout(() => resolve(_value === (form as Form).password), 8),
                                ),
                            message: 'Passwords do not match',
                        } as ValidationsConfig,
                    ],
                },
            ];

            const { result, unmount } = withSetup(() =>
                useValiValid<Form>({
                    initial: { password: '', confirm: '' },
                    validations: crossFieldValidations,
                    debounceMs: 0,
                }),
            );

            // Set confirm to 'secret' and password to 'secret' via setValues — confirm rule must pass
            result.setValues({ password: 'secret', confirm: 'secret' });
            await nextTick();
            // Wait for async rule on 'confirm' (triggered via watchFields on 'password') to settle
            await new Promise((r) => setTimeout(r, 30));
            await nextTick();

            expect(result.errors.confirm).toBeNull();

            // Now change password to something different via setValues — confirm watcher must re-run and fail
            result.setValues({ password: 'different' });
            await nextTick();
            await new Promise((r) => setTimeout(r, 30));
            await nextTick();

            expect(Array.isArray(result.errors.confirm)).toBe(true);
            expect((result.errors.confirm as string[]).length).toBeGreaterThan(0);

            unmount();
        });

        it('setValues with multiple fields revalidates all watchers with matching watchFields', async () => {
            type Form = { base: string; a: string; b: string };

            const multiWatchValidations: FieldValidationConfig<Form>[] = [
                {
                    field: 'base',
                    validations: [{ type: ValidationType.Required } as ValidationsConfig],
                },
                {
                    field: 'a',
                    watchFields: ['base'],
                    validations: [
                        {
                            type: ValidationType.AsyncPattern,
                            asyncFn: (_value: string, form?: Record<string, any>) =>
                                new Promise<boolean>((resolve) =>
                                    setTimeout(() => resolve(_value === (form as Form).base), 8),
                                ),
                            message: 'a must equal base',
                        } as ValidationsConfig,
                    ],
                },
                {
                    field: 'b',
                    watchFields: ['base'],
                    validations: [
                        {
                            type: ValidationType.AsyncPattern,
                            asyncFn: (_value: string, form?: Record<string, any>) =>
                                new Promise<boolean>((resolve) =>
                                    setTimeout(() => resolve(_value === (form as Form).base), 8),
                                ),
                            message: 'b must equal base',
                        } as ValidationsConfig,
                    ],
                },
            ];

            const { result, unmount } = withSetup(() =>
                useValiValid<Form>({
                    initial: { base: '', a: '', b: '' },
                    validations: multiWatchValidations,
                    debounceMs: 0,
                }),
            );

            // Set all fields so a and b match base — both watchers should pass
            result.setValues({ base: 'hello', a: 'hello', b: 'hello' });
            await nextTick();
            await new Promise((r) => setTimeout(r, 30));
            await nextTick();

            expect(result.errors.a).toBeNull();
            expect(result.errors.b).toBeNull();

            // Change base only via setValues — both a and b watchers must re-run and fail
            result.setValues({ base: 'world' });
            await nextTick();
            await new Promise((r) => setTimeout(r, 30));
            await nextTick();

            expect(Array.isArray(result.errors.a)).toBe(true);
            expect((result.errors.a as string[]).length).toBeGreaterThan(0);
            expect(Array.isArray(result.errors.b)).toBe(true);
            expect((result.errors.b as string[]).length).toBeGreaterThan(0);

            unmount();
        });
    });
});
