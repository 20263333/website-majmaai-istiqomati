import re

with open('src/components/AdminPanel.tsx', 'r') as f:
    content = f.read()

# Replace parking assignment
content = content.replace(
    'const assignedFloorNum = index + 1;',
    'const assignedFloorNum = -(P + BS - index);'
)

# Replace basement assignment
content = content.replace(
    'const assignedFloorNum = P + index + 1;',
    'const assignedFloorNum = -(BS - index);'
)

# Replace shop assignment
content = content.replace(
    'const assignedFloorNum = P + BS + index + 1;',
    'const assignedFloorNum = index + 1;'
)

# Replace apartment assignment
content = content.replace(
    'const assignedFloorNum = P + BS + S + index + 1;',
    'const assignedFloorNum = S + index + 1;'
)

with open('src/components/AdminPanel.tsx', 'w') as f:
    f.write(content)
print("Patched AdminPanel.tsx")
