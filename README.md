
  # Scooter Smartlight Control App

  This is a code bundle for Scooter Smartlight Control App. The original project is available at https://www.figma.com/design/ipW4mBzWf9T2eSiairx6OZ/Scooter-Smartlight-Control-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Reading Firebase diagnostics

  The Firebase helper logs what configuration is missing when initialization cannot proceed. To view these warnings:

  - **Locally:** run `npm run dev` and open the app in your browser; check the browser console for messages that begin with `Firebase configuration is incomplete...`.
  - **On Vercel:** open the deployment in a browser and inspect the console the same way. For server-side context, view the Vercel project logs in the dashboard; search for the same warning text to confirm which environment variables are absent.

  Seeing the warning indicates the app skipped Firebase initialization because one of the required keys (`apiKey`, `projectId`, or `appId`) was empty.
  