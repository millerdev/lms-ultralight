import js from "@eslint/js"
import globals from "globals"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import babelParser from "@babel/eslint-parser"

export default [
  js.configs.recommended,
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.mocha,
        chai: "readonly",
        assert: "readonly",
        expect: "readonly",
      },
    },
  },
  {
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      sourceType: "module",
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          configFile: "./babel.config.json",
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2015,
      },
    },
    rules: {
      "quotes": 0,
      "no-console": 1,
      "no-debugger": 1,
      "no-var": 1,
      "semi": [2, "never"],
      "comma-dangle": ["error", "always-multiline"],
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
      "jsx-quotes": 1,
    },
  },
]
