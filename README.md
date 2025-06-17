# Lunex Chat

Your AI-powered conversation companion built with Next.js, React Router, and Convex.

## Features

- Real-time AI chat conversations
- User authentication with Clerk
- File upload support (images, PDFs)
- Chat branching and regeneration
- Temporary chat mode
- Model selection and customization
- Search functionality across chats
- **Query Parameter Integration** - Create chats directly from URL

## Query Parameter Feature

You can create a new chat and start a conversation directly by visiting a URL with a query parameter:

### Usage

```
https://your-domain.com/?q=your+question+here
https://your-domain.com/?q=How%20does%20AI%20work%3F
```

### Examples

- `/?q=What is React?` - Creates a new chat asking "What is React?"
- `/?q=Explain quantum computing` - Creates a new chat asking "Explain quantum computing"
- `/chat/existing-chat-id?q=Follow up question` - Adds a question to an existing empty chat

### How it works

1. **Home Page**: When visiting `/` with a `q` parameter, it automatically creates a new chat and sends the message
2. **Existing Chat**: When visiting `/chat/:id` with a `q` parameter, it sends the message to that chat if it's empty
3. **URL Encoding**: Special characters are automatically encoded/decoded for safe URL usage
4. **Navigation**: After processing the query parameter, users are redirected to the appropriate chat

### Integration Examples

You can create links or buttons that redirect users to start specific conversations:

```html
<!-- HTML Link -->
<a href="/?q=Tell me about AI">Ask about AI</a>

<!-- JavaScript -->
window.location.href = "/?q=" + encodeURIComponent("What is machine learning?");
```

```javascript
// React Component
import { createUrlWithQuery } from "@/lib/utils";

function QuickStart() {
    const handleQuickQuestion = (question) => {
        window.location.href = createUrlWithQuery("/", question);
    };

    return <button onClick={() => handleQuickQuestion("Explain React hooks")}>Ask about React hooks</button>;
}
```

## Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up environment variables
4. Run the development server: `pnpm dev`

## Tech Stack

- **Frontend**: Next.js, React Router, TypeScript
- **Backend**: Convex (database & functions)
- **Authentication**: Clerk
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **File Upload**: UploadThing

## License

MIT License
