We use `mdbook` to generate the manual.

Use `mdbook serve --open manual/` to open up the book in your browser. As you edit the files, it should reload automatically.

To integrate the manual into the page run these commands:

- `mdbook build`
- `mv manual/book public/manual`
  You will not be able to see the manual via the Vite dev server otherwise.

## notes

- We have custom `Iridium Light` and `Iridium Dark` themes. You can edit the specific colors in `./theme/css/variables.css`
- We duplicate the favicon in the `./theme/` directory, so you will have to edit both the one ine `/public/` and `/manual/theme` if you make a change.
