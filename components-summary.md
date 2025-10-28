# USFM Editor Components - High-Level Structure

## Overview
The components folder contains a composable architecture for USFM (Unified Standard Format Markers) text editing, built on Slate.js.

## Core Components

### BasicUsfmEditor
- **Purpose**: Foundation WYSIWYG editor for USFM text
- **Key Responsibilities**:
  - USFM ↔ Slate conversion
  - Verse navigation and selection
  - Character and paragraph formatting
  - Editor state management

### Verse Components
- **VerseNumber**: Renders non-editable verse numbers with optional menu
- **VerseNumberMenu**: Context menu for verse operations (join/unjoin, add/remove)
- **SelectionSeparator**: Utility to prevent selection issues across verse boundaries

## Toolbar Components

### UsfmToolbar
- Renders customizable toolbar from button specifications
- Supports three button types:
  - `MarkButton` - Character-level formatting (bold, italics, etc.)
  - `ParagraphButton` - Paragraph-level formatting (headings, etc.)
  - `ActionButton` - Custom actions

### ToolbarButton
- Individual button implementation with active/inactive states

## Higher-Order Components (HOCs)

### ToolbarEditor
- **Pattern**: `withToolbar(Editor) => EditorWithToolbar`
- Wraps any editor with a toolbar

### ChapterEditor
- **Pattern**: `withChapterPaging(Editor) => ChapterPagedEditor`
- Adds chapter-by-chapter paging
- Manages full book USFM, displays single chapter

### ChapterSelectionEditor
- **Pattern**: `withChapterSelection(Editor) => EditorWithChapterSelection`
- Adds chapter dropdown selector
- Enables navigation between chapters

## Composition Pattern

All components implement the `UsfmEditorRef` interface, enabling composition:

```typescript
// Basic
<BasicUsfmEditor />

// With toolbar
withToolbar(BasicUsfmEditor)

// With chapter features
withChapterSelection(withChapterPaging(BasicUsfmEditor))

// Full composition
withToolbar(withChapterSelection(withChapterPaging(BasicUsfmEditor)))
```

## Common Interface

All editors expose:
- `getMarksAtSelection()` / `addMarkAtSelection()` / `removeMarkAtSelection()`
- `getParagraphTypesAtSelection()` / `setParagraphTypeAtSelection()`
- `goToVerse()`

This allows HOCs to wrap any compatible editor implementation.

