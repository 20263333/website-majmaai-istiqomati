import re

with open('src/components/MainPage.tsx', 'r') as f:
    content = f.read()

# Replace block by block using flexible regex
# We want to find:
# initial={{ opacity: 0, y: <number> }}
# whileInView={{ opacity: 1, y: 0 }}
# viewport={{ once: true, margin: "<string>" }}
# transition={{ duration: <number>, ease: "<string>" ... }}

def repl(match):
    # Preserve delay if it exists
    delay_match = re.search(r'delay:\s*([0-9\.]+)', match.group(0))
    delay_str = f", delay: {delay_match.group(1)}" if delay_match else ""
    
    return f"""initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.35{delay_str} }}"""

pattern = re.compile(r'initial=\{\{\s*opacity:\s*0,\s*y:\s*\d+\s*\}\}\s*whileInView=\{\{\s*opacity:\s*1,\s*y:\s*0\s*\}\}\s*viewport=\{\{\s*once:\s*true,\s*margin:\s*"[^"]+"\s*\}\}\s*transition=\{\{[^\}]+\}\}')

new_content, count = pattern.subn(repl, content)

with open('src/components/MainPage.tsx', 'w') as f:
    f.write(new_content)

print(f"Replaced {count} instances.")
