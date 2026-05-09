import os

path = r"c:\Users\TESTE\OneDrive\Desktop\ESTAGIO\s\denv do app\app dev\projeto-galiza-mensuravel-\galiza-project-manager\src\pages\KPIs.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "setIsParamFormOpen(false);" in line and i < len(lines) - 2 and "</div>" in lines[i+1] and "</div>" in lines[i+2]:
        new_lines.append(line)
        new_lines.append('               }}>Salvar</button>\n')
        new_lines.append('            </div>\n')
        new_lines.append('          </div>\n')
        skip = True
        continue
    if skip:
        if "</div>" in line:
            # We already added the two </div> tags
            # We need to skip exactly two lines that contain </div>
            pass
        else:
            new_lines.append(line)
            skip = False
        continue
    new_lines.append(line)

# Also fix the end of the file if needed
# Let's just write this for now
with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
