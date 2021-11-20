module.exports = {
  "parser": "@babel/eslint-parser",
  "extends": "eslint:recommended",
  "root": true,
  "env": {
    "es6": true,
    "browser": true,
    "node": true
  },
  "plugins": [
    "react",
    "react-hooks",
  ],
  "rules": {
    "quotes": 0,
    "no-console": 1,
    "no-debugger": 1,
    "no-var": 1,
    "semi": [2, "never"],
    "comma-dangle": 0,
    "no-trailing-spaces": 0,
    "eol-last": 0,
    "no-unused-vars": 1,
    "no-underscore-dangle": 0,
    "no-unexpected-multiline": 1,
    "no-alert": 2,
    "no-lone-blocks": 0,
    "react/jsx-uses-react": "error",
    "react/jsx-uses-vars": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "jsx-quotes": 1
  },
  "parserOptions": {
    "sourceType": "module"
  }
}
