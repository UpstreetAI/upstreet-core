const DISCORD_API_VERSION = '10'
const DISCORD_API_BASE = `https://discord.com/api/v${DISCORD_API_VERSION}`

export interface DiscordMessage {
  id: string
  content: string
  author: {
    global_name: string
    username: string
    avatar?: string
  }
  timestamp: string
  url: string
  attachments: {
    url: string
    name: string
  }[]
}

interface RawDiscordMessage {
  id: string
  content: string
  author: {
    id: string
    global_name: string
    username: string
    avatar?: string
  }
  timestamp: string
  attachments: {
    url: string
    filename: string
  }[]
}

interface DiscordThread {
  id: string
  name: string
  parent_id?: string
}

export class DiscordAPIError extends Error {
  constructor(
    public status: number,
    public code: number,
    message: string
  ) {
    super(message)
    this.name = 'DiscordAPIError'
  }
}

// Verify the bot has access to the channel
async function verifyChannelAccess(
  channelId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}`, {
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new DiscordAPIError(
      response.status,
      error.code,
      `Channel access check failed: ${error.message}`
    )
  }
}

interface DiscordThreadWithMessages extends DiscordThread {
  messages: DiscordMessage[]
}

export async function fetchDiscordThreadsWithMessages(
  channelId: string
): Promise<DiscordThreadWithMessages[]> {
  const token = process.env.DOCS_DISCORD_BOT_TOKEN

  if (!token) {
    console.error('DOCS_DISCORD_BOT_TOKEN is not set in environment variables')
    return []
  }

  try {
    // Verify channel access
    await verifyChannelAccess(channelId, token)

    // Fetch active threads in the forum channel
    const threadsResponse = await fetch(
      `${DISCORD_API_BASE}/guilds/${process.env.DOCS_DISCORD_GUILD_ID}/threads/active`,
      {
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!threadsResponse.ok) {
      const error = await threadsResponse.json()
      throw new DiscordAPIError(
        threadsResponse.status,
        error.code,
        error.message
      )
    }

    const { threads }: { threads: DiscordThread[] } =
      await threadsResponse.json()

    // Process all threads concurrently
    const threadResults = await Promise.all(
      threads.map(async thread => {
        if (thread.parent_id !== channelId) {
          console.log(
            'Skipped thread',
            thread.id,
            'because it does not belong to the channel.'
          )
          return null // Skip this thread
        }

        try {
          const threadMessagesResponse = await fetch(
            `${DISCORD_API_BASE}/channels/${thread.id}/messages?limit=100`,
            {
              headers: {
                Authorization: `Bot ${token}`,
                'Content-Type': 'application/json'
              }
            }
          )

          if (!threadMessagesResponse.ok) {
            console.warn(`Failed to fetch messages for thread ${thread.id}`)
            return null // Skip this thread on failure
          }

          const messages: RawDiscordMessage[] =
            await threadMessagesResponse.json()

          const formattedMessages: DiscordMessage[] = messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            author: {
              global_name: msg.author.global_name,
              username: msg.author.username,
              avatar: msg.author.avatar
                ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
                : undefined
            },
            timestamp: msg.timestamp,
            url: `https://discord.com/channels/@me/${thread.id}/${msg.id}`,
            attachments: msg.attachments.map(attachment => ({
              url: attachment.url,
              name: attachment.filename
            }))
          }))

          return {
            id: thread.id,
            name: thread.name,
            messages: formattedMessages
          }
        } catch (error) {
          console.warn(
            `Error fetching messages for thread ${thread.id}:`,
            error
          )
          return null
        }
      })
    )

    // Filter out null values (threads that were skipped or failed)
    return threadResults.filter(
      (result): result is DiscordThreadWithMessages => result !== null
    )
  } catch (error) {
    if (error instanceof DiscordAPIError) {
      switch (error.code) {
        case 50001:
          console.error(
            'Bot lacks permissions to access this channel. Make sure the bot has the following permissions:'
          )
          console.error('- VIEW_CHANNEL')
          console.error('- READ_MESSAGE_HISTORY')
          break
        case 10003:
          console.error('Channel not found. Please verify the channel ID.')
          break
        case 50013:
          console.error(
            'Bot lacks required permissions. Check bot role permissions in the server.'
          )
          break
        default:
          console.error(`Discord API Error: ${error.message}`)
      }
    }
    throw error // Re-throw to let the caller handle it
  }
}
