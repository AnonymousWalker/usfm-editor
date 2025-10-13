# Verse Number Shortcut Feature

## Overview
The USFM Editor now supports an automatic verse number insertion shortcut. When you type `\v {number} ` (with a space at the end), it will automatically create a new verse with that number.

## How It Works

### Pattern Detection
The editor detects when you type:
- `\v` followed by one or more spaces
- A verse number (digits)
- A space to trigger the conversion

Examples:
- `\v 2 ` → Creates verse 2
- `\v  10 ` → Creates verse 10 (extra spaces are supported)
- `\v 123 ` → Creates verse 123

### Behavior
1. The shortcut is triggered when you press the space key after typing the verse number
2. The `\v {number}` text is automatically removed
3. A new verse node with the specified number is inserted after the current verse
4. The cursor moves to the new verse, ready for you to type content

## Usage Example

In the editor, if you're at the end of verse 1:
```
\v 1 This is verse one.|  (cursor here)
```

Type `\v 2 ` and you'll get:
```
\v 1 This is verse one.
\v 2 |  (cursor here)
```

## Testing

### Manual Testing Steps
1. Run the demo: `npm start`
2. Open the editor in your browser
3. Navigate to the end of any verse
4. Type `\v {number} ` (e.g., `\v 5 `)
5. Verify that a new verse is created with the correct number

### Technical Implementation
- **File**: `src/plugins/keyHandlers.ts`
- **Plugin**: `withVerseShortcut`
- **Integration**: Added to the editor plugin pipeline in `BasicUsfmEditor.tsx`

The plugin:
1. Intercepts text insertion via `editor.insertText`
2. Checks if the inserted text is a space
3. Looks back at the text before the cursor
4. Matches against the pattern `/\\v\s+(\d+)$/`
5. If matched, deletes the text and inserts a new verse node

## Notes
- The feature only works when typing in text content, not in verse numbers themselves
- The verse number must be numeric (digits only)
- At least one space is required between `\v` and the number
- The final space is what triggers the conversion

