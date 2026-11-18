with open('src/components/MainPage.tsx', 'r') as f:
    content = f.read()

content = content.replace('initial={ opacity:', 'initial={{ opacity:')
content = content.replace(', y: 80 }', ', y: 80 }}')

content = content.replace('whileInView={ opacity: 1, y: 0 }', 'whileInView={{ opacity: 1, y: 0 }}')
content = content.replace('viewport={ once: true, margin:', 'viewport={{ once: true, margin:')
content = content.replace('px" }', 'px" }}')

content = content.replace('transition={ duration:', 'transition={{ duration:')
content = content.replace(', type: "spring", bounce: 0.4 }', ', type: "spring", bounce: 0.4 }}')
content = content.replace(', delay: 0.15 }', ', delay: 0.15 }}')

# Fix delay: idx which became delay: idx }
# Actually delay: idx might be `transition={ duration: 0.8, type: "spring", bounce: 0.4, delay: idx }`
import re
content = re.sub(r'transition=\{ duration: (.*?), type: "spring", bounce: 0.4(.*?)\s*\}', r'transition={{ duration: \1, type: "spring", bounce: 0.4\2 }}', content)


with open('src/components/MainPage.tsx', 'w') as f:
    f.write(content)
print("Fixed syntax")
