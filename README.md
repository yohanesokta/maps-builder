# MapBuilder Pro - Level Editor

A professional 2D/3D map editor for level design, optimized for the GL-FPS project.

## Architecture

The application is built with a modular JavaScript architecture:

-   **`app.js`**: Entry point that initializes the Editor.
-   **`js/editor.js`**: Core engine that manages application state, inputs, and the main loop.
-   **`js/camera.js`**: Handles 2D viewport navigation (pan and zoom).
-   **`js/objectManager.js`**: Manages all map entities (walls, enemies, items, and the player).
-   **`js/renderer.js`**: 2D Canvas renderer for the top-down editor view.
-   **`js/view3D.js`**: Wireframe 3D preview renderer with WASD movement.
-   **`js/uiManager.js`**: Manages sidebar properties, toolbar actions, and texture loading.
-   **`js/utils.js`**: Helper functions for math and colors.

## Features

-   **Top-down 2D Editing**: Precise placement of walls and entities.
-   **Reactive 3D Preview**: Real-time wireframe visualization that centers on selected objects.
-   **Player Entity**: A mandatory singleton entity represented as an ellipsoid in 3D.
-   **Resize Handles**: Drag corners of walls to resize them with grid snapping.
-   **Texture Management**: Dynamic texture selection loaded from `loader.json` with custom overrides.
-   **Persistence**: Global settings (Grid, Def Y) are saved to `localStorage`.
-   **History System**: Full Undo/Redo support (Ctrl+Z / Ctrl+Y).
-   **Import/Export**: Save and load maps in JSON format.

## Controls

### 2D Editor
-   **Left Click**: Select or create object (depending on mode).
-   **Left Click + Drag**: Create Wall or Rect-Select (in Select mode).
-   **Shift + Click**: Multi-select.
-   **Middle Mouse / Alt + Left Click**: Pan camera.
-   **Scroll Wheel**: Zoom in/out.
-   **Delete / Backspace**: Delete selected objects.
-   **Ctrl + A**: Select all objects.

### 3D Preview
-   **Left Click + Drag**: Rotate camera (Yaw/Pitch).
-   **W / A / S / D**: Move camera relative to view.
-   **1 / 2 / 3 / 4**: Switch to view presets (Top, Front, Side, Isometric).

## Data Structure

The exported JSON contains:
-   `walls`: Array of wall objects with `x1, z1, x2, z2` (plane) and `y1, y2` (height).
-   `enemies`, `magazines`, `medkits`: Arrays of point entities with `x, z, y1, y2`.
-   `player`: A single object representing the starting position.

&copy; 2026 yohanesokta
