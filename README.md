# vali-valid-vue

Vue 3 composable for [vali-valid](https://www.npmjs.com/package/vali-valid).

## Installation

```bash
npm install vali-valid-vue vali-valid
```

## Usage

```vue
<script setup lang="ts">
import { useValiValid } from 'vali-valid-vue';
import { ValidationType } from 'vali-valid';

const { values, errors, handleChange, handleSubmit } = useValiValid({
  initialValues: { email: '', password: '' },
  validationConfig: [
    { field: 'email', validations: [{ type: ValidationType.Required }, { type: ValidationType.Email }] },
    { field: 'password', validations: [{ type: ValidationType.Required }, { type: ValidationType.MinLength, value: 8 }] },
  ],
});
</script>

<template>
  <form @submit.prevent="handleSubmit((data) => console.log(data))">
    <input :value="values.email" @input="handleChange('email', ($event.target as HTMLInputElement).value)" />
    <span v-if="errors.email">{{ errors.email[0] }}</span>
    <button type="submit">Submit</button>
  </form>
</template>
```

## License

MIT
