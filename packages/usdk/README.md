# Upstreet SDK (USDK)

AI Agents SDK in TypeScript and React.

[![npm version](https://badge.fury.io/js/usdk.svg)](https://badge.fury.io/js/usdk)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Documentation](https://img.shields.io/badge/docs-upstreet.ai-blue)](https://docs.upstreet.ai/)
[![Join our Discord](https://img.shields.io/discord/123456789012345678.svg?label=Join%20our%20Discord&logo=discord&colorB=7289DA)](https://upstreet.ai/usdk-discord)
[![GitHub](https://img.shields.io/badge/GitHub-UpstreetAI-181717?style=flat&logo=github)](https://github.com/UpstreetAI)
[![Twitter Follow](https://img.shields.io/twitter/follow/upstreetai?style=social)](https://x.com/upstreetai)


## Table of Contents
- [Overview](#overview)
- [Supported Environments](#supported-environments)
- [Quick Install](#quick-install)
- [What is Upstreet SDK?](#what-is-upstreet-sdk)
- [How does Upstreet SDK help?](#how-does-upstreet-sdk-help)
- [Key Features](#key-features)
- [Commands](#commands)
- [Documentation](#documentation)
- [License](#license)

## Overview

Upstreet SDK (USDK) is a simple yet powerful command-line interface to build, test and deploy Upstreet AI Agents at scale.

USDK is crafted to give you the freedom to build Agents independently, yet also make your interaction with Upstreet's platform easier, allowing effortless creation, management, and communication with autonomous Upstreet AI Agents.

## Supported Environments

USDK integrates smoothly with various development environments:

- Node.js (version 22.9.0 and above)
- Windows, macOS, and Linux compatible

## Quick Install

Embark on your Upstreet journey in seconds:

```bash
npm install -g usdk
```

## What is Upstreet SDK and How Does It Help?

Upstreet SDK is your all-access pass to the world of Upstreet Agents, designed to enhance your experience through a powerful Command Line Interface (CLI). 

Here's how USDK empowers you:

1. **Craft and Manage Agents**: Create and customize unique Upstreet Agents with user-friendly commands.

2. **Natural Conversations**: Engage in fluid, natural language interactions with Agents through our multi-agent chat interface.

3. **Account Management**: Authenticate and log account details.

4. **Streamlined Workflow**: From Agent creation to deployment, USDK simplifies every step of your journey in the Upstreet ecosystem.

Dive into the boundless potential of Upstreet Agents, whether you're an AI enthusiast, a developer, or a curious explorer.

## Key Features

- **Intuitive CLI**: User-friendly commands for seamless interaction
- **Agent Management**: Create, list, edit and remove your AI Agents effortlessly
- **Multi-Agent Chat**: Engage in rich, dynamic conversations with multiple Upstreet Agents

## Commands

Explore the power of USDK with these core commands:

### `usdk version`

Display the current version of the SDK.

```bash
usdk version
```

### `usdk login`

Log in to the SDK.

```bash
usdk login
```

### `usdk logout`

Log out of the SDK.

```bash
usdk logout
```

### `usdk status`

Check the current login status of the SDK and display account details.

```bash
usdk status
```

### `usdk create`

Create a new agent, from either a prompt or template.

```bash
usdk create [directory] [options]
```

Options:
- `-p, --prompt <string>`: Creation prompt
- `-feat, --feature <feature...>`: Specify features for the agent
- `-f, --force`: Overwrite existing files
- `-F, --force-no-confirm`: Overwrite existing files without confirming
- `-j, --json <string>`: Agent JSON string to initialize with
- `-y, --yes`: Non-interactive mode
- `-s, --source <string>`: Main source file for the agent

### `usdk edit`

Edit an existing agent.

```bash
usdk edit [directory] [options]
```

Options:
- `-p, --prompt <string>`: Edit prompt
- `-af, --add-feature <feature...>`: Add a feature
- `-rf, --remove-feature <feature...>`: Remove a feature

### `usdk pull`

Download source of deployed agent.

```bash
usdk pull <agent-id> [directory] [options]
```

Options:
- `-f, --force`: Overwrite existing files
- `-F, --force-no-confirm`: Overwrite existing files without confirming

### `usdk chat`

Chat with agents in a multiplayer room.

```bash
usdk chat [agent-ids...] [options]
```

Options:
- `-b, --browser`: Open the chat room in a browser window
- `-r, --room <room>`: The room name to join
- `-g, --debug`: Enable debug logging

### `usdk deploy`

Deploy an agent to the network.

```bash
usdk deploy [agent-ids...]
```

### `usdk rm`

Remove a deployed agent from the network.

```bash
usdk rm [agent-ids...]
```

For a full command reference, use `usdk --help` or `usdk <command> --help`.

## Documentation

Dive deeper into Upstreet SDK with our comprehensive guides:

- [What is an Upstreet Agent?](https://docs.upstreet.ai/concepts/usdk/architecture#what-are-upstreet-agents)
- [Getting Started](https://docs.upstreet.ai/install)
- [Command Reference](https://docs.upstreet.ai/concepts/usdk/architecture#available-commands)
- [Tutorials and Examples](https://docs.upstreet.ai/examples)

## License

Upstreet SDK is released under the ISC License.

---

We're thrilled to have you join the Upstreet community! As you explore and create with USDK, remember that our support team and community forums are always here to help.

👉 Join our Discord community to log issues and find inspiration: https://upstreet.ai/usdk-discord

👉 Talk to us directly for deeper issues, and commercial usage: hello@upstreet.ai

Happy creating in Upstreet! 🌆🚀