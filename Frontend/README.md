# React + Vite

## USDT deposits

Only USDT on the TRON (TRC20) network is supported. Each deposit must be at least $30 USDT; daily yield activation still requires a $300 main balance. The public receiving address is configured by `VITE_TRC20_DEPOSIT_ADDRESS` for the frontend build and `OFFICIAL_TRC20_DEPOSIT_ADDRESS` in `../Backend/src/config/constants.js`; both values must be valid and identical. The backend `TRC20_DEPOSIT_ADDRESS` environment variable can override its source default. Never configure a private key or recovery phrase in either environment.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Account and mobile notifications

The notification bell shows account activity and admin announcements. Users can opt in to mobile browser notifications from the bell menu. Push delivery requires HTTPS and the backend environment variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` to be configured; generate a key pair with `npx web-push generate-vapid-keys` from the `Backend` directory and keep the private key only in the backend host's secret environment. Do not commit either key. The server persists inbox notifications even while push delivery is not configured.

Mobile alerts are sent for credited daily yield, referral rewards, deposit/withdrawal submission and review outcomes, and admin announcements. On iPhone or iPad, users must add the site to the Home Screen and enable notifications for the installed web app. On Android, users must allow notifications in their browser.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
