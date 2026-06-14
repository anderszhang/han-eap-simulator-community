# Han Eap Simulator Web UI

Han Eap Simulator Web UI is the frontend for a semiconductor equipment automation simulation system. It is designed for SECS/GEM, HSMS, and EAP integration workflows, with tools for equipment connection management, SML message maintenance, manual send/receive operations, auto-reply rules, visual Flow orchestration, and Checklist-driven SML/Flow generation.

This repository contains only the frontend source code. Backend services, databases, migration scripts, seed data, checklist templates, and complete application distributions are maintained separately by the main project.

中文版本: [README.zh-CN.md](README.zh-CN.md)

## Highlights

- **Built for semiconductor EAP workflows**: Models HSMS connections, SECS/GEM messages, SML files, and VID/RPTID/CEID checklist data.
- **Visual Flow orchestration**: Configure Send, Receive, Delay, and Function steps as graph nodes, with rule-based transitions, variable extraction, fixed variables, and runner debugging.
- **Flexible variable system**: A Flow can declare variables required before execution, extract variables from received SECS messages by path, or compute new variables through JavaScript/TypeScript functions.
- **Checklist-driven generation**: Generate Dynamic Report SML from equipment checklists, or generate equipment-specific Flows from Flow Templates.
- **Manual SECS workbench**: Select an Engine, browse SML files, inspect message content, send messages, and observe logs in one workspace.
- **Reusable templates**: Save Flows as Flow Templates and reuse them across checklists, with automatic binding to checklist events and variable definitions.

## Screenshots

### Engine Management

Maintain active/passive HSMS Engines, IP/port settings, Device ID, Checklist binding, and runtime status.

![Engine Management](docs/images/engine-overview.png)

### SML Library

Manage SML folders and message content in a tree structure. SML files can be reused by Manual SECS, AutoReply, and Flow Send nodes.

![SML Library](docs/images/sml-library.png)

### Checklist Configuration

Maintain CEID, RPTID, VID, Data Format, and ValueMap definitions, then generate SML or Flow artifacts from the checklist.

![Checklist Configuration](docs/images/checklist-detail.png)

### Flow Editor

Build automation workflows with graph nodes, rule edges, Receive variable extraction, Flow Variables, the Flow runner, and Checklist Binding.

![Flow Editor](docs/images/flow-editor.png)

### Manual SECS

A manual SECS workbench for debugging: choose an Engine and SML file on the left, inspect communication logs in the center, and view or edit SML content on the right.

![Manual SECS](docs/images/manual-secs.png)

### Auto SECS

Run a published Flow against a selected Engine, with live Flow node status, SECS communication logs, and SML details. This is useful for initialization, Dynamic Report configuration, and equipment integration playback.

![Auto SECS](docs/images/auto-secs.png)

## Core Features

### Engine

- Create, edit, start, and stop HSMS Engines.
- Support both active and passive connection modes.
- Display runtime status, connection state, Device ID, Checklist binding, and creator.

### SML

- Manage SML messages by folder.
- Support template folders and Host/EQP type markers.
- Reuse SML files in Manual SECS, AutoReply, and Flow.

### Manual SECS

- Send SML messages through a selected Engine.
- Subscribe to real-time logs and send/receive records.
- Search Engines and SML files in a three-column workspace.

### Auto SECS

- Execute a published Flow against a selected Engine.
- Track node execution status in the graph.
- Inspect complete SECS send/receive logs and Flow step results.

### AutoReply

- Configure automatic replies for specific incoming SxFy messages.
- Support variable path extraction and conditional matching.
- Simulate standard response behavior from either equipment-side or host-side workflows.

### Flow

- Build graph-based Send, Receive, Delay, and Function workflows.
- Declare Flow Variables with required inputs and default values before execution.
- Extract values from received SECS messages by index path, such as CarrierID, PortID, and ACK.
- Use JavaScript/TypeScript functions to compute variables from existing variables, message content, or function return values.
- Use `{VariableName}` placeholders in Send nodes to inject variables into SML messages.
- Support fixed-value and default-value variables for batch reuse of the same Flow.
- Support variable extraction, computed variables, and rule transitions in Receive nodes.
- Assign variables before execution from the Flow Run page.
- Combine Flow Templates with Checklist Binding to generate equipment-specific Flows.

### Checklist

- Maintain CEID/RPTID/VID mappings.
- Import checklist data from Excel.
- Generate Dynamic Report SML from Checklist data.
- Generate equipment-specific Flows from Checklist + Flow Template, such as `A029_HOST` and `A029_INIT`.

## Quick Start

1. Open the application URL and sign in.
2. Configure or start an HSMS connection from the Engine page.
3. Maintain common SECS messages from the SML page.
4. Select an Engine and SML file in Manual SECS for manual debugging.
5. Import or maintain CEID/RPTID/VID definitions from the Checklist page.
6. Create or edit automation Flows, or generate equipment-specific Flows from Checklist + Flow Template.
7. Select an Engine and a published Flow in Auto SECS to run automated tests.

New databases open a first-run setup page. Create the password for the built-in administrator account there:

```text
admin / <password-created-in-first-run-setup>
```

## Local Development

```bash
npm install
npm run dev
npm run build
npm run type-check
```

The Vite development server usually runs at `http://localhost:3000`. The backend API base URL is controlled by runtime frontend configuration and `src/utils/api.ts`; in local development it usually points to `http://localhost:8080/api`.

## Developer Documentation

See [DEVELOPER.md](DEVELOPER.md) for local development, environment variables, common commands, the technology stack, and repository boundaries.

## License

The frontend source code and frontend documentation in this repository are licensed under the MIT License. Backend source code, prebuilt backend binaries, full application distributions, database migrations, seed datasets, and checklist templates are excluded and require separate distribution terms.
