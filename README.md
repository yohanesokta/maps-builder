# MapBuilder
> used to spesific project [GL-FPS](https://github.com/yohanesokta/GL-FPS)

> MapBuilder Pro is a specialized level design suite developed to facilitate the creation of complex 3D environments for the GL-FPS engine. This application provides a professional workspace for managing spatial geometry and entity placement within a top-down editing environment.

## Application Overview
The editor serves as the primary design tool for the [GL-FPS](https://github.com/yohanesokta/GL-FPS) project, translating two-dimensional top-down inputs into precise 3D map data. By utilizing an X and Z axis for planar positioning and a dedicated Y axis for vertical elevation, the system allows for the detailed configuration of wall heights, floor levels, and ceiling heights. Beyond structural geometry, the suite includes integrated tools for the placement and parameterization of interactive entities such as enemy units, ammunition magazines, and medical kits. The application also features a selective 3D wireframe preview, which dynamically centers on and renders the currently selected object(s) to allow for focused spatial analysis. The workflow is supported by professional editing features including multi-object selection (Shift+Click or Rectangle Drag), Select All (Ctrl+A), grid-based snapping for architectural precision, and a comprehensive undo/redo history for efficient iteration. Property editing is automatically restricted to single-object selections to ensure data integrity.

## System Integration
The output of MapBuilder Pro is a structured JSON serialization that contains the complete definition of the game world. This includes texture references, scaling factors, and specific entity properties required by the GL-FPS engine. Once a level is designed, the application provides options to either download the map data as a JSON file or copy it directly to the clipboard for immediate testing or script integration. The exported data is fully compatible with the game's asset pipeline, ensuring a seamless transition from design to runtime. Integration is accomplished by placing the JSON data into the appropriate directory within the GL-FPS project structure.

## Operational Environment
Designed as a client-side web application, MapBuilder Pro utilizes HTML5 Canvas and JavaScript to provide a high-performance editing experience without the need for installation or server-side dependencies. The editor is accessible through any modern web browser. Navigation is managed through a combination of keyboard and mouse inputs, featuring arrow-key or middle-mouse panning for the 2D view and WASD keys for 3D spatial navigation. The 3D viewport also supports interactive rotation via mouse drag and instant perspective switching using numeric keys (1-4). Object properties are managed through a dedicated interface panel, allowing for granular control over every element in the map.

## Licensing
This project is released under the GNU General Public License. For detailed information regarding usage and distribution rights, please refer to the LICENSE file included in the repository documentation.
