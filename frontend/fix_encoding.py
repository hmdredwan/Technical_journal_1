import re

with open('src/components/admin/ManageIssues.tsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Replace corrupted separator lines with clean ones
content = re.sub(
    r'  // .*?â.*?â.*?â.*?\n  // (Volume|Issue|Paper) CRUD\n  // .*?â.*?â.*?â.*?',
    r'  // ================================================================================\n  // \1 CRUD\n  // ================================================================================',
    content,
    flags=re.DOTALL
)

with open('src/components/admin/ManageIssues.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('File fixed successfully!')
