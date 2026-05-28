import sys
import os

file_path = r'C:\Users\andrey\.gemini\antigravity\brain\b0507c1c-7d62-48e5-aa42-a917e30383e1\scratch\youtubeMusicDownload-main\frontend\src\App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if '{showTerms && (' in line:
        if '<AnimatePresence>' in lines[i-1]:
            start_idx = i - 1
            break
        elif '<AnimatePresence>' in lines[i-2]:
            start_idx = i - 2
            break

if start_idx != -1:
    count_presence = 0
    found_presence = False
    for i in range(start_idx, len(lines)):
        if '<AnimatePresence' in lines[i]:
            count_presence += 1
            found_presence = True
        if '</AnimatePresence>' in lines[i]:
            count_presence -= 1
        
        if found_presence and count_presence == 0:
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    component_call = '''      <TermsModal
        showTerms={showTerms}
        termsLoading={termsLoading}
        termsContent={termsContent}
        handleAcceptTerms={handleAcceptTerms}
      />\n'''
    
    lines = lines[:start_idx] + [component_call] + lines[end_idx+1:]
    import_stmt = "import { TermsModal } from './components/TermsModal';\n"
    lines.insert(9, import_stmt)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('Successfully extracted TermsModal')
else:
    print('Failed to find TermsModal bounds')
