# copt.dev

Hi, my name is Mina Saleeb. I'm building my portfolio site here.

To get started with this project locally, you need to have Node.js, at least version 12.

## Development

This project is based on Next.js and TypeScript. Simply run `npm install` then run `npm run dev` to start developing on `localhost:3000`. You can optionally set the `PORT` environment variable to change the port number this project runs on.

## Production

To create an optimized build and deploy, install `pm2` globally then follow these instructions:

1. Make sure the node modules are installed (`npm install`)
2. Run `pm2 start ecosystem.config.js`
3. Optionally, set `pm2` to work with your `systemd` controller to automatically startup by running `pm2 startup`
4. Run `pm2 save` to save the pm2 tasks.

I personally have this deployed using a reverse-proxy with NGINX to take advantage of better caching and TLS configurations, but other servers will do as well.

## Pull Requests

The project uses `husky` and `commitizen`/`commitlint` to check for any linting or type issues before a commit. If you run into an issue when trying to commit that says something like, `git: cz is not a command`, then just install commitizen globally with `npm i -g commitizen`. Before commit, format code `npm run format`.
