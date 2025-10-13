# Verse Number Features

## Overview
The USFM Editor now supports two convenient features for working with verse numbers:
1. **Automatic insertion**: Type `\v {number} ` to create a new verse
2. **Backspace deletion**: Delete verse numbers with the backspace key, just like regular text

## How It Works

### 1. Automatic Verse Insertion

#### Pattern Detection
The editor detects when you type:
- `\v` followed by one or more spaces
- A verse number (digits)
- A space to trigger the conversion

Examples:
- `\v 2 ` → Creates verse 2
- `\v  10 ` → Creates verse 10 (extra spaces are supported)
- `\v 123 ` → Creates verse 123

#### Behavior
1. The shortcut is triggered when you press the space key after typing the verse number
2. The `\v {number}` text is automatically removed
3. A new verse node with the specified number is inserted after the current verse
4. The cursor moves to the new verse, ready for you to type content

### 2. Deleting Verse Numbers with Backspace

#### How to Delete
1. Position your cursor at the start of the verse content (right after the verse number)
2. Press the backspace key
3. The verse number is deleted and the content merges with the previous verse

#### Example
Before:
```
\v 1 This is verse one.
\v 2 |This is verse two.  (cursor here)
```

After pressing backspace:
```
\v 1 This is verse one. This is verse two.|  (cursor here)
```

#### Protections
- The "front" verse marker cannot be deleted (it's a special marker)
- If you try to delete it, the backspace action is prevented
- Chapter numbers are also protected from accidental deletion

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

#### Testing Verse Insertion
1. Run the demo: `npm start`
2. Open the editor in your browser
3. Navigate to the end of any verse
4. Type `\v {number} ` (e.g., `\v 5 `)
5. Verify that a new verse is created with the correct number

#### Testing Verse Deletion
1. Position cursor at the start of any verse content (right after the verse number)
2. Press backspace
3. Verify that:
   - The verse number is deleted
   - The verse content merges with the previous verse
   - The cursor is positioned at the merge point
4. Try to delete the "front" verse marker - verify it's protected

### Technical Implementation

#### Verse Insertion Plugin
- **File**: `src/plugins/keyHandlers.ts`
- **Plugin**: `withVerseShortcut`
- **Integration**: Added to the editor plugin pipeline in `BasicUsfmEditor.tsx`

The plugin:
1. Intercepts text insertion via `editor.insertText`
2. Checks if the inserted text is a space
3. Looks back at the text before the cursor
4. Matches against the pattern `/\\v\s+(\d+)$/`
5. If matched, deletes the text and inserts a new verse node

#### Backspace Deletion
- **File**: `src/plugins/keyHandlers.ts`
- **Plugin**: `withBackspace` (modified existing plugin)
- **Uses**: `VerseTransforms.removeVerseAndConcatenateContentsWithPrevious`

The enhanced backspace behavior:
1. Detects when cursor is at the start of verse content (after verse number)
2. Checks if the previous block is a verse number
3. Prevents deletion of "front" verse marker
4. Removes the verse number and merges content with previous verse
5. Positions cursor at the merge point

## Notes

### Verse Insertion
- The shortcut only works when typing in text content, not in verse numbers themselves
- The verse number must be numeric (digits only)
- At least one space is required between `\v` and the number
- The final space is what triggers the conversion

### Verse Deletion
- Backspace deletion only works when cursor is at the start of verse content
- The "front" verse marker is protected and cannot be deleted
- When deleting a verse number, the content automatically merges with the previous verse
- A leading space is automatically added if needed to prevent words from running together

