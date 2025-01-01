export async function loadMessagesFromDatabase({
  supabase,
  agentId,
  conversationId,
  limit,
}) {
  const { error, data } = await supabase
    .from( 'agent_messages' )
    .select([
      'id',
      'method',
      'args',
      'attachments',
      'src_user_id',
      'src_name',
      'created_at',
      'metadata',
    ].join(','))
    .eq('user_id', agentId)
    .eq('conversation_id', conversationId)
    .order( 'created_at', { ascending: true })
    .limit( limit );
  if (!error) {
    return decodeMessages(data);
  } else {
    throw new Error(`${error.code} ${error.message}`);
  }
}

function decodeMessages(messages) {
  return messages.map( message => ({
    id: message.id,
    method: message.method,
    args: message.args,
    attachments: message.attachments,
    userId: message.src_user_id,
    name: message.src_name,
    timestamp: message.created_at,
    metadata: message.metadata,
  }));
}
