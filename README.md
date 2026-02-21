# Digs

An iOS app to browse your [Discogs](https://www.discogs.com) vinyl collection offline.

Built with [Expo](https://expo.dev) and React Native.

## Features

- **Offline browsing** — sync your Discogs collection and browse it without an internet connection;
- **Search** — full-text search across artists, albums, and labels;
- **Random picker** — pick a random release from your collection, optionally filtered by folder;
- **Release details** — cover art, tracklist, genres, styles, community ratings;
- **Folder organization** — browse your collection organized by Discogs folders.

## Prerequisites

- Node.js (v18+);
- [Expo CLI](https://docs.expo.dev/get-started/set-up-your-environment/);
- A [Discogs](https://www.discogs.com) account.

## Setup

1. Clone the repository and install dependencies:

   ```sh
   git clone https://github.com/rlustin/digs.git
   cd digs
   npm install
   ```

2. Register a Discogs application at https://www.discogs.com/settings/developers and set the callback URL to `digs://oauth/callback`.

3. Create a `.env` file at the root of the project:

   ```
   EXPO_PUBLIC_DISCOGS_KEY=your_consumer_key
   EXPO_PUBLIC_DISCOGS_SECRET=your_consumer_secret
   ```

4. Run the app:

   ```sh
   npx expo run:ios
   ```

## License

[MIT](LICENSE)
