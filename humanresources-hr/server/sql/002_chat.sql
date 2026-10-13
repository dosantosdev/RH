-- Chat interno e central de atendimentos
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group', 'support')),
  title VARCHAR(180),
  status VARCHAR(30) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_participants (
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_company_last_message
  ON chat_conversations(company_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user
  ON chat_participants(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
  ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_company
  ON chat_messages(company_id, created_at DESC);

INSERT INTO permissions (key, label, category)
VALUES ('chat_manage', 'Gerenciar atendimentos do chat', 'Comunicação')
ON CONFLICT (key) DO UPDATE
SET label = EXCLUDED.label, category = EXCLUDED.category;

INSERT INTO access_role_permissions (access_role_id, permission_id)
SELECT ar.id, p.id
FROM access_roles ar
JOIN permissions p ON p.key = 'chat_manage'
WHERE ar.name = 'admin'
ON CONFLICT DO NOTHING;

DROP TRIGGER IF EXISTS trg_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER trg_chat_conversations_updated_at
BEFORE UPDATE ON chat_conversations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
