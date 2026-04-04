# MapBuilder

A professional 2D/3D map editor for level design, optimized for the GL-FPS project.

The editor serves as the primary design tool for the [GL-FPS](https://github.com/yohanesokta/GL-FPS) project, translating two-dimensional top-down inputs into precise 3D map data. By utilizing an X and Z axis for planar positioning and a dedicated Y axis for vertical elevation, the system allows for the detailed configuration of wall heights, floor levels, and ceiling heights.

Beyond structural geometry, the suite includes integrated tools for the placement and parameterization of interactive entities such as player starting positions, enemy units, ammunition magazines, and medical kits. The application also features a selective 3D wireframe preview, which dynamically centers on and renders the currently selected object(s) to allow for focused spatial analysis.

The workflow is supported by professional editing features including multi-object selection (Shift+Click or Rectangle Drag), Select All (Ctrl+A), grid-based snapping for architectural precision, corner-based resizing for walls, and a comprehensive undo/redo history for efficient iteration. Property editing is automatically restricted to single-object selections to ensure data integrity.

## Architecture

The application is built with a modular JavaScript architecture:

-   **`app.js`**: Entry point that initializes the Editor engine.
-   **`js/editor.js`**: Core engine that manages application state, inputs, and the main simulation loop.
-   **`js/camera.js`**: Handles 2D viewport navigation including high-performance pan and zoom logic.
-   **`js/objectManager.js`**: Manages the lifecycle of all map entities including serialization and singleton enforcement for the player.
-   **`js/renderer.js`**: Optimized 2D Canvas renderer for the primary top-down workspace.
-   **`js/view3D.js`**: Reactive wireframe 3D preview renderer with specialized ellipsoid rendering for entities.
-   **`js/uiManager.js`**: Orchestrates sidebar property bindings, toolbar actions, and asynchronous texture asset discovery.
-   **`js/utils.js`**: Foundational utility suite for mathematical precision and color generation.

## Key Features

-   **Precision 2D Mapping**: Industry-standard top-down workspace for rapid level drafting.
-   **Reactive 3D Visualization**: Real-time projection focusing on relevant selections.
-   **Persistent Configuration**: Global settings (Grid Snap, Default Y-levels) persisted via `localStorage` for seamless sessions.
-   **Advanced Geometry Control**: Interactive resize handles for walls with integrated grid alignment.
-   **Dynamic Asset Loading**: Texture registry synchronized with `loader.json` with manual override capabilities.
-   **Non-Destructive Workflow**: Full transactional history with standard shortcut support.

## Technical Controls

### Workspace (2D)
-   **Selection**: Left Click (Single), Shift + Click (Multi), Click + Drag (Area).
-   **Creation**: Left Click + Drag (Wall), Left Click (Entity placement).
-   **Navigation**: Middle Mouse / Alt + Left Click (Pan), Scroll Wheel (Zoom).
-   **Operations**: Delete / Backspace (Remove), Ctrl + A (Select All), Ctrl + Z/Y (Undo/Redo).

### Preview (3D)
-   **Rotation**: Left Click + Drag (Yaw/Pitch axis control).
-   **Translation**: W / A / S / D (Viewport relative movement).
-   **Presets**: 1 (Top), 2 (Front), 3 (Side), 4 (Isometric).

&copy; 2026 yohanesokta
