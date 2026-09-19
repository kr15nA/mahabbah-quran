INSERT INTO permissions (code, name, description)
VALUES 
  ('academic.tasmi.read', 'Read Tasmi', 'Allows reading Tasmi session data'),
  ('academic.tasmi.manage', 'Manage Tasmi', 'Allows creating, updating, and deleting Tasmi sessions')
ON CONFLICT (code) DO NOTHING;