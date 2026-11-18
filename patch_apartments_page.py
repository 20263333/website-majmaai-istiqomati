import re

with open('src/components/ApartmentsPage.tsx', 'r') as f:
    content = f.read()

# Pattern for mobile view
pattern1 = r'''\{floor\.floorType === 'parking' \? \(floor\.customLabel \|\| `Парковка \$\{floor\.floorNumber\}`\) :
\s*floor\.floorType === 'basement_shop' \? \(floor\.customLabel \|\| `Подвал \$\{floor\.floorNumber\}`\) :
\s*floor\.customLabel \? `\$\{floor\.customLabel\} \$\{floor\.floorNumber\}` :
\s*`Этаж \$\{floor\.floorNumber\}`\}'''

replacement1 = '''{floor.floorType === 'parking' ? `${floor.floorNumber} ${floor.customLabel || 'Парковка'}` :
                             floor.floorType === 'basement_shop' ? `${floor.floorNumber} ${floor.customLabel || 'Подвал'}` :
                             floor.customLabel ? `${floor.customLabel} ${floor.floorNumber}` :
                             `Этаж ${floor.floorNumber}`}'''

content = re.sub(pattern1, replacement1, content)


# Pattern for desktop view
pattern2 = r'''\{floor\.floorType === 'parking' \? \(floor\.customLabel \? `Парковка \(\$\{floor\.customLabel\}\)` : `Парковка \$\{floor\.floorNumber\}`\) :
\s*floor\.floorType === 'basement_shop' \? \(floor\.customLabel \? `Подвал \(\$\{floor\.customLabel\}\)` : `Подвал \$\{floor\.floorNumber\}`\) :
\s*floor\.customLabel \? `\$\{floor\.customLabel\} \$\{floor\.floorNumber\}` :
\s*`Этаж \$\{floor\.floorNumber\}`\}'''

replacement2 = '''{floor.floorType === 'parking' ? `${floor.floorNumber} ${floor.customLabel || 'Парковка'}` :
                               floor.floorType === 'basement_shop' ? `${floor.floorNumber} ${floor.customLabel || 'Подвал'}` :
                               floor.customLabel ? `${floor.customLabel} ${floor.floorNumber}` :
                               `Этаж ${floor.floorNumber}`}'''

content = re.sub(pattern2, replacement2, content)


with open('src/components/ApartmentsPage.tsx', 'w') as f:
    f.write(content)
print("Patched ApartmentsPage.tsx")
