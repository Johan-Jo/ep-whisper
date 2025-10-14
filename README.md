# EP-Whisper - Voice-to-Estimate Painting App

A voice-driven companion to EstimatePro that turns spoken room walkthroughs into cost proposals for painting jobs.

## Features

- **Swedish-only voice recognition** (sv-SE) with Whisper integration
- **Excel-based MEPS catalog** - strict whitelist of painting tasks
- **Real-time geometry calculations** with opening and wardrobe deductions
- **Dynamic template instances** for contextual task suggestions
- **Voice corrections and undo** via event logging
- **Swedish pricing and formatting** with ROT notes
- **PDF export** with SE branding
- **GDPR-compliant telemetry** (no raw audio by default)

## Quick Start

### Prerequisites

- Node.js 22.4.1 or higher
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd EP-Whisper/app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
# Edit .env.local with your OpenAI API key
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests with Vitest
- `npm run test:ui` - Run tests with UI
- `npm run test:run` - Run tests once
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Project Structure

```
app/
├── src/
│   ├── app/          # Next.js app router pages
│   ├── lib/          # Core business logic
│   │   ├── types.ts  # TypeScript type definitions
│   │   ├── geometry/ # Room calculation engine
│   │   ├── excel/    # Excel import and validation
│   │   ├── voice/    # Voice processing (ASR/TTS)
│   │   ├── nlp/      # Intent parsing and mapping
│   │   ├── pricing/  # Cost calculation engine
│   │   └── pdf/      # PDF export functionality
│   ├── components/   # React components
│   └── tests/        # Test files
├── excel/            # MEPS catalog files
└── docs/             # Documentation
```

### TypeScript Types

The app uses strict TypeScript with core types defined in `src/lib/types.ts`:

- `MepsRow` - Excel catalog entry structure
- `RoomGeometry` - Room dimensions and openings
- `LineItem` - Individual estimate line items
- `Project` & `Room` - Project and room data structures

## Architecture

### Milestones

- **Milestone A**: Data Foundation & Core Logic (Excel import, geometry calculations, CLI output)
- **Milestone B**: Voice & Intelligence Layer (ASR/TTS, NLP parsing, UI)
- **Milestone C**: PDF & Telemetry (export, audit trail, monitoring)

### Key Principles

1. **Excel-only tasks** - Never emit tasks not in the MEPS catalog
2. **Swedish-first** - All voice processing in sv-SE with decimal comma formatting
3. **Dynamic templates** - Context-aware task suggestions via template instances
4. **Event-driven corrections** - Undo/redo via audit trail
5. **GDPR compliance** - No raw audio storage by default

## Testing

The project uses Vitest for unit testing and React Testing Library for component tests.

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm test

# Run tests with coverage
npm run test:run -- --coverage
```

## Performance Targets

- **Time-to-result**: ≤ 60 seconds from "Start room" to proposal preview
- **Accuracy**: ±3% vs manual calculation on sample rooms
- **Voice confidence**: Request repeat if < 0.7 confidence

## Contributing

1. Follow the established TypeScript patterns
2. Add tests for new functionality
3. Ensure Swedish language compliance
4. Update documentation for new features

## License

[Add license information]