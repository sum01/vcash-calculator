# Contributing

## General

* [snake_case](https://en.wikipedia.org/wiki/Snake_case) variable/function
  naming is used.
* Javascript ES6 is used, so `let` and `const` are used instead of `var`.
* This uses Bootstrap v4, which is currently in beta. When it's released, it
  should be updated and checked for breakage.
* All API calls are made from the browser via the `main.js` file. The
  [cors-anywhere proxy](https://github.com/Rob--W/cors-anywhere) makes this
  possible.

## Editor tooling

* [Prettier](https://github.com/prettier/prettier) is used to beautify the `.js`
  and `.md` files.
* [Htmlbeautifier](https://github.com/threedaymonk/htmlbeautifier) is used to
  beautify `.html` files.
* [Editorconfig](http://editorconfig.org/) should be used when submitting any
  changes.

### Git workflow

1. Fork the repo
2. Make your changes on a new branch
3. Keep commits consise with `git add -p`
4. Push to your rep, and submit a pull request onto `master`
