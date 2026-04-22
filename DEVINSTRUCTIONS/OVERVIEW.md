- `npm run dev` to start the dev server.
- `npm run build && npm run preview` to see the final build.
- A GitHub action will automatically deploy any changes to main.

## testing

- `npm run test` to run them
- `npm run coverage` generates a coverage report which you can view in `/coverage/index.html`.

Please write tests for any changes you make, as much as is reasonable.

### resources for testing

- philosophy: https://testing-library.com/docs/guiding-principles

- examples: https://testing-library.com/docs/react-testing-library/example-intro

- list of DOM matchers: https://github.com/testing-library/jest-dom

## code style

- `npm run format` to format before committing.
- `npm run lint`. Use `npm run lint:fix` to accept any automatic fixes.
- On PRs, a GitHub action will make sure everything is formatted properly and has no lint errors.

## organization

### React Layer

- `src/app`: UI components that depend on app state
- `src/components`: Generic UI components
- `src/assets`: Non-code assets

###

- `src/globals`: Global state and actions

### Non-React Layer

- `src/features`: Everything else that doesn't have to deal with the UI or global state
- `public`: Stuff that should not be processed during the build
  - includes worker scripts

### Adding new example models

- To add a new example model drop your new model (with .ant extension) into src/assests/examples
- Use dash characters to represent spaces in your files name, this will be used to display the name to the user.
- You might need to refresh your browser cache (F5 on windows) to see the change.

# specific stuff

- [migrations](./MIGRATIONS.md) (IMPORTANT IF YOU ARE MODIFYING SAVE DATA)
- [global state management](./GLOBALS.md)
- [styling](./STYLING.md)
- [simulation + copasi/antimony](./SIMULATION.md)
- [url](./URL.md)
- [icons](./ICONS.md)
- [manual](./MANUAL.md)