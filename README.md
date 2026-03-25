# vali-valid-vue

Vue 3 composable for [vali-valid](https://www.npmjs.com/package/vali-valid) — `useValiValid` with reactive state, async validation, i18n, criteriaMode, and full TypeScript support.

[![npm](https://img.shields.io/npm/v/vali-valid-vue)](https://www.npmjs.com/package/vali-valid-vue)
[![license](https://img.shields.io/npm/l/vali-valid-vue)](LICENSE)

---

## Installation

```bash
npm install vali-valid-vue vali-valid
```

> **Note:** `vali-valid` must be version **≥ 3.1.0**.

---

## Quick start

```vue
<script setup lang="ts">
import { useValiValid } from 'vali-valid-vue';
import { rule } from 'vali-valid';

interface LoginForm {
  email: string;
  password: string;
}

const { form, errors, handleChange, validate } = useValiValid<LoginForm>({
  initial: { email: '', password: '' },
  validations: [
    { field: 'email',    validations: rule().required().email().build() },
    { field: 'password', validations: rule().required().minLength(8).build() },
  ],
});

async function onSubmit() {
  const result = await validate();
  if (result.isValid) {
    console.log('Submit:', form);
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <div>
      <input
        placeholder="Email"
        :value="form.email"
        @input="handleChange('email', ($event.target as HTMLInputElement).value)"
      />
      <p v-for="msg in (errors.email || [])" :key="msg" style="color:red">{{ msg }}</p>
    </div>

    <div>
      <input
        type="password"
        placeholder="Password"
        :value="form.password"
        @input="handleChange('password', ($event.target as HTMLInputElement).value)"
      />
      <p v-for="msg in (errors.password || [])" :key="msg" style="color:red">{{ msg }}</p>
    </div>

    <button type="submit">Login</button>
  </form>
</template>
```

---

## Async validation

Use `rule().asyncPattern()` for server-side checks like username availability. The composable sets `isValidating` to `true` while the async rule is pending.

```vue
<script setup lang="ts">
import { useValiValid } from 'vali-valid-vue';
import { rule } from 'vali-valid';

const { form, errors, isValidating, handleChange, validate } = useValiValid({
  initial: { username: '', email: '', password: '' },
  validations: [
    {
      field: 'username',
      validations: rule()
        .required()
        .minLength(3)
        .maxLength(20)
        .asyncPattern(
          async (value: string) => {
            const res = await fetch(`/api/users/check?username=${value}`);
            const { available } = await res.json();
            return available; // true = valid, false = invalid
          },
          'Username is already taken.'
        )
        .build(),
    },
    { field: 'email',    validations: rule().required().email().build() },
    { field: 'password', validations: rule().required().minLength(8).passwordStrength().build() },
  ],
  debounceMs: 400,
});
</script>

<template>
  <form @submit.prevent="validate()">
    <div>
      <input placeholder="Username" :value="form.username"
        @input="handleChange('username', ($event.target as HTMLInputElement).value)" />
      <span v-if="isValidating">Checking…</span>
      <p v-for="msg in (errors.username || [])" :key="msg" style="color:red">{{ msg }}</p>
    </div>
    <!-- email and password fields… -->
    <button type="submit">Register</button>
  </form>
</template>
```

---

## i18n — runtime locale switching

`vali-valid` ships with built-in error messages in **EN, ES, PT, FR and DE**. Call `setLocale()` and re-run `validate()` to update all messages instantly.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useValiValid } from 'vali-valid-vue';
import { rule, setLocale } from 'vali-valid';

const locales = ['en', 'es', 'pt', 'fr', 'de'] as const;
const locale = ref('en');

const { form, errors, handleChange, validate } = useValiValid({
  initial: { name: '', email: '' },
  validations: [
    { field: 'name',  validations: rule().required().minLength(3).build() },
    { field: 'email', validations: rule().required().email().build() },
  ],
});

async function switchLocale(l: string) {
  locale.value = l;
  setLocale(l as any);
  await validate(); // re-validate so messages appear in the new language
}
</script>

<template>
  <div>
    <button v-for="l in locales" :key="l" @click="switchLocale(l)"
      :style="{ fontWeight: locale === l ? 'bold' : 'normal' }">
      {{ l.toUpperCase() }}
    </button>

    <input placeholder="Name" :value="form.name"
      @input="handleChange('name', ($event.target as HTMLInputElement).value)" />
    <p v-for="msg in (errors.name || [])" :key="msg">{{ msg }}</p>

    <input placeholder="Email" :value="form.email"
      @input="handleChange('email', ($event.target as HTMLInputElement).value)" />
    <p v-for="msg in (errors.email || [])" :key="msg">{{ msg }}</p>

    <button @click="validate()">Validate ({{ locale.toUpperCase() }})</button>
  </div>
</template>
```

---

## criteriaMode

Control whether all failing rules are returned or only the first one per field.

```ts
const { errors } = useValiValid({
  initial: { password: '' },
  validations: [
    { field: 'password', validations: rule().required().minLength(8).passwordStrength().build() },
  ],
  criteriaMode: 'firstError', // stops at the first failing rule
});
```

---

## Server-side errors

After a form submission that returns a 422, merge server errors directly into the composable state:

```ts
const { setServerErrors } = useValiValid({ ... });

async function onSubmit() {
  const res = await api.register(form);
  if (res.status === 422) {
    setServerErrors({
      email: ['Email is already in use.'],
    });
  }
}
```

---

## Dynamic rules

Add, remove, or replace validation rules at runtime — useful for conditional fields:

```ts
const { addFieldValidation, clearFieldValidations } = useValiValid({ ... });

// Show a coupon field only for 'pro' plan
watch(plan, (val) => {
  if (val === 'pro') {
    addFieldValidation('coupon', rule().required().minLength(4).build());
  } else {
    clearFieldValidations('coupon');
  }
});
```

---

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `initial` | `T` | required | Initial form values |
| `validations` | `FieldValidationConfig<T>[]` | `[]` | Validation rules per field |
| `locale` | `string` | global locale | Per-instance locale override (`'en'`, `'es'`, `'pt'`, `'fr'`, `'de'`) |
| `criteriaMode` | `'all' \| 'firstError'` | `'all'` | Return all errors or stop at first |
| `validateOnMount` | `boolean` | `false` | Run full validation immediately on mount |
| `validateOnBlur` | `boolean` | `false` | Validate a field when it loses focus |
| `validateOnSubmit` | `boolean` | `false` | Suppress per-keystroke validation until first submit |
| `debounceMs` | `number` | `0` | Debounce delay for async validators (ms) |
| `asyncTimeout` | `number` | `10000` | Timeout for async validators (ms) |

---

## Return value

All returned properties are reactive (`ref` or `reactive` internally — access them directly in `<template>` or in `<script setup>`).

| Property / Method | Type | Description |
|---|---|---|
| `form` | `T` | Current form values (reactive) |
| `errors` | `Partial<Record<keyof T, string[]>>` | Current validation errors per field |
| `isValid` | `boolean` | `true` when there are no errors |
| `isValidating` | `boolean` | `true` while an async validator is running |
| `isSubmitted` | `boolean` | `true` after the first `validate()` call |
| `submitCount` | `number` | Number of times `validate()` has been called |
| `touchedFields` | `Partial<Record<keyof T, boolean>>` | Fields that have been interacted with |
| `dirtyFields` | `Partial<Record<keyof T, boolean>>` | Fields whose value differs from `initial` |
| `handleChange(field, value)` | `void` | Update a field value and trigger validation |
| `handleBlur(field)` | `void` | Mark a field as touched and trigger blur validation |
| `validate()` | `Promise<{ isValid: boolean; errors: … }>` | Validate the entire form |
| `trigger(field?)` | `Promise<void>` | Validate one field or the whole form |
| `reset(newInitial?)` | `void` | Reset form and errors to initial (or new) values |
| `setValues(values)` | `void` | Patch multiple field values without validation |
| `setServerErrors(errors)` | `void` | Merge server-side errors into the error state |
| `clearErrors(field?)` | `void` | Clear one field's error or all errors |
| `getValues()` | `T` | Snapshot of the current form values |
| `addFieldValidation(field, rules)` | `void` | Add validation rules to a field at runtime |
| `removeFieldValidation(field, type)` | `void` | Remove a specific rule type from a field |
| `setFieldValidations(field, rules)` | `void` | Replace all rules for a field |
| `clearFieldValidations(field)` | `void` | Remove all rules from a field |

---

## Requirements

| Peer dependency | Minimum version |
|---|---|
| `vue` | `3.0.0` |
| `vali-valid` | `3.1.0` |

---

## Links

- [Documentation](https://vali-valid.dev/vue)
- [vali-valid core on npm](https://www.npmjs.com/package/vali-valid)
- [GitHub](https://github.com/UBF21/Vali-Valid-Vue)

---

## License

MIT
