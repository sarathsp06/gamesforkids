
# Kids Learning Games on Firebase Studio

Welcome to Kids Learning Games! This is an interactive web application built with Next.js and hosted on Firebase, designed to help young children learn through fun and engaging games. Currently, it features a typing game ("Letter Leap") and an addition game ("Addition Adventure").

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Tech Stack](#tech-stack)
3.  [Games Available](#games-available)
4.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Installation](#installation)
    *   [Running Locally](#running-locally)
5.  [Project Structure](#project-structure)
6.  [Scripts](#scripts)
7.  [Generative AI with Genkit](#generative-ai-with-genkit)
9.  [Contributing & Customization](#contributing--customization)

## Project Overview

This application provides a platform for educational games tailored for children, focusing on foundational skills like typing and arithmetic. The interface is designed to be kid-friendly, using simple visuals and interactive elements.

## Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Generative AI**: [Genkit (Firebase Genkit)](https://firebase.google.com/docs/genkit)
*   **Deployment**: [Firebase Hosting](https://firebase.google.com/docs/hosting) via GitHub Actions

## Games Available

1.  **Letter Leap**:
    *   **Objective**: Helps children practice typing by prompting them to type out displayed words.
    *   **Features**: Adaptive difficulty (conceptual), visual feedback for correct/incorrect key presses, hand indicators (left/right) for upcoming letters, spoken words, WPM and accuracy tracking, session statistics.
2.  **Addition Adventure**:
    *   **Objective**: Teaches basic addition (numbers 1-5) in an interactive way.
    *   **Features**: Children solve `X + Y = Z` problems by dragging items from addend piles to a sum pile or by clicking the sum pile. Visual feedback is provided, along with a scoring system and session stats.

## Getting Started

### Prerequisites

*   Node.js (version 18.x or later recommended)
*   npm (usually comes with Node.js)
*   Firebase Account (for deployment and potentially other Firebase services)
*   Firebase CLI (if managing Firebase project manually): `npm install -g firebase-tools`

### Installation

1.  **Clone the repository (if applicable) or open in Firebase Studio.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running Locally

The application consists of two main parts that can be run locally: the Next.js frontend and the Genkit AI flows (if Genkit features are actively used and need debugging).

1.  **Run the Next.js development server:**
    ```bash
    npm run dev
    ```
    This will typically start the app on `http://localhost:9002`.

2.  **Run the Genkit development server (optional, for AI flow development/testing):**
    Open a new terminal and run:
    ```bash
    npm run genkit:dev
    ```
    Or, for auto-reloading on changes to flow files:
    ```bash
    npm run genkit:watch
    ```
    The Genkit development UI will be available, usually at `http://localhost:4000`.

## Project Structure

Here's a brief overview of the key directories:

```
.
├── public/                   # Static assets (after build, Next.js output from 'out' folder is moved here)
├── src/
│   ├── ai/                   # Genkit AI related code
│   │   ├── flows/            # Genkit flow definitions (e.g., adaptiveSpeedFlow.ts)
│   │   ├── genkit.ts         # Genkit global instance initialization
│   │   └── dev.ts            # Entry point for running Genkit in development
│   ├── app/                  # Next.js App Router
│   │   ├── games/            # Game-specific pages and components
│   │   │   ├── addition-adventure/page.tsx
│   │   │   └── letter-leap/page.tsx
│   │   ├── globals.css       # Global styles and Tailwind CSS theme
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Homepage / Game selection page
│   ├── components/           # Reusable React components
│   │   ├── layout/           # Layout components (e.g., MainLayout)
│   │   └── ui/               # ShadCN UI components
│   ├── hooks/                # Custom React hooks (e.g., game logic like useLetterLeapGame.ts)
│   ├── lib/                  # Utility functions, constants, and localStorage logic
│   │   ├── constants.ts      # Application-wide constants (words, praise messages, etc.)
│   │   ├── store.ts          # localStorage utility functions
│   │   └── utils.ts          # General utility functions (like cn for classnames)
│   └── types/                # TypeScript type definitions (index.ts)
├── .env                      # Environment variables (empty by default)
├── firebase.json             # Firebase project configuration (for Hosting)
├── next.config.js            # Next.js configuration (configured for static export)
├── package.json              # Project dependencies and scripts
├── tailwind.config.ts        # Tailwind CSS configuration
└── tsconfig.json             # TypeScript configuration
```

## Scripts

*   `npm run dev`: Starts the Next.js development server (with Turbopack).
*   `npm run genkit:dev`: Starts the Genkit development server.
*   `npm run genkit:watch`: Starts the Genkit development server with file watching.
*   `npm run build`: Builds the Next.js application for production. It outputs to an `out/` directory which is then moved to `public/` for Firebase Hosting static deployment.
*   `npm run start`: Starts the Next.js production server (not used for static export).
*   `npm run lint`: Lints the codebase using Next.js's built-in ESLint configuration.
*   `npm run typecheck`: Runs TypeScript to check for type errors.
*   `npm run test`: Runs Jest tests (currently includes a basic build test).

## Generative AI with Genkit

This project uses Genkit for integrating Generative AI features.

*   **Flows**: AI logic is encapsulated in "flows" located in `src/ai/flows/`. Each flow typically defines:
    *   Input and output schemas using Zod.
    *   A prompt template (using Handlebars).
    *   An `ai.defineFlow` call that orchestrates the AI interaction.
    *   An exported wrapper function to call the flow.
*   **Initialization**: The global Genkit instance (`ai`) is initialized in `src/ai/genkit.ts`.
*   **Development**: Use `npm run genkit:dev` or `npm run genkit:watch` to run Genkit locally and access its development UI for inspecting flows, prompts, and traces.
*   **Usage in Frontend**: Client-side components can interact with Genkit flows using functions like `streamFlow` (or simple fetch requests if flows are exposed as HTTP endpoints, though direct client-side imports are often used for server actions in Next.js). The current `adaptiveSpeedFlow.ts` is designed to be called as a server action.

## Deployment

This application is configured for deployment to **Firebase Hosting** using **GitHub Actions**.

*   **Workflow Files**: `.github/workflows/firebase-hosting-merge.yml` and `.github/workflows/firebase-hosting-pull-request.yml`.
*   **Merge to `master`**: Automatically builds and deploys the app to the live Firebase Hosting channel.
*   **Pull Requests**: Automatically builds and deploys the app to a preview channel on Firebase Hosting.
*   **Build Process**: The `npm run build` script creates a static export of the Next.js app in the `out/` directory. This `out/` directory is then renamed to `public/`, which is the directory Firebase Hosting serves from.

## Contributing & Customization

### Adding a New Game

1.  **Create Game Logic Hook**:
    *   Develop a new custom hook in `src/hooks/` (e.g., `useNewGame.ts`). This hook will manage the game's state, logic, and interactions.
    *   Define relevant types for the game's state and session statistics in `src/types/index.ts`.
2.  **Create Game Page**:
    *   Add a new route in `src/app/games/` (e.g., `src/app/games/new-game/page.tsx`).
    *   Use the custom hook to power the game's UI.
    *   Design the UI using ShadCN components and Tailwind CSS.
3.  **Add to Game Selection Page**:
    *   Update `src/app/page.tsx` to include a new card linking to your game.
4.  **Constants & Assets**:
    *   Add any game-specific constants (e.g., word lists, item types) to `src/lib/constants.ts`.
    *   Place any static assets in the `public/` directory if needed (though try to use SVGs or CSS for visuals where possible).
5.  **Styling**: Add any specific global styles or animations to `src/app/globals.css` if necessary.

### Modifying Existing Games

*   Locate the game's main page in `src/app/games/` (e.g., `letter-leap/page.tsx` or `addition-adventure/page.tsx`).
*   Locate the game's logic hook in `src/hooks/` (e.g., `useLetterLeapGame.ts` or `useAdditionAdventureGame.ts`).
*   Modify UI elements, game rules, or state management as needed.

### Styling

*   **Global Styles**: `src/app/globals.css` contains Tailwind base styles, component styles, and custom CSS variables for theming.
*   **ShadCN Theme**: Colors are primarily managed via HSL CSS variables in `globals.css`. You can adjust these to change the overall look and feel.
*   **Tailwind CSS**: Use Tailwind utility classes directly in your components for styling.

---

Happy Coding in Firebase Studio!
