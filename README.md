# Lunex

Lunex is an open-source, AI-powered conversation platform built with a modern tech stack. It provides a feature-rich, real-time chat experience that is both extensible and easy to use.

The project is hosted and can be accessed at [lunex.deoxy.dev](https://lunex.deoxy.dev).

## Features

- **Resumable Streams**: Responses continue streaming even after a page reload.
- **Real-time Chat Syncing**: Conversations are synced in real-time across all your devices.
- **Real-time AI Conversations**: Engage in dynamic, streamed conversations with various AI models.
- **BYOKEY Support**: Bring Your Own Key for OpenRouter to use your own API credits.
- **Dynamic Model Support**: Use any model available on [OpenRouter](https://openrouter.ai/) by configuring it in your settings.
- **Web Search**: The AI can perform web searches to provide answers on recent events and topics.
- **User Authentication**: Secure user login and registration handled by Clerk.
- **Temporary Chat Mode**: Start a conversation without needing to sign in.
- **Automatic Title Generation**: Conversations are automatically named based on the initial prompt.
- **File Uploads**: Supports uploading images and PDFs into the chat for context.
- **Chat Branching**: Create different conversation paths from any message.
- **Message Regeneration**: Easily regenerate AI responses to explore different answers.
- **Conversation Search**: Quickly find past conversations with a built-in search feature.
- **Shareable Chats**: Share your conversations with others via a unique link.
- **URL-Based Chat Creation**: Start a new chat instantly by using a query parameter in the URL (e.g., `/?q=Hello`).

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Backend & Database**: [Convex](https://www.convex.dev/)
- **Authentication**: [Clerk](https://clerk.com/)
- **File Uploads**: [UploadThing](https://uploadthing.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Deployment**: Vercel

## How to Run Locally

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js >= 18.0.0
- pnpm

### Installation

1.  **Clone the repository:**

    ```sh
    git clone https://github.com/d3oxy/lunex.git
    cd lunex
    ```

2.  **Install dependencies:**

    ```sh
    pnpm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root of your project and add the necessary environment variables for Convex, Clerk, and UploadThing.

4.  **Run the development server:**
    ```sh
    pnpm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## License

Distributed under the MIT License. See `LICENSE` for more information.
