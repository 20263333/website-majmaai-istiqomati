import re

with open('src/components/ApartmentsPage.tsx', 'r') as f:
    content = f.read()

# Desktop Vertical Floors Stack is around line 464
content = re.sub(
    r'(<div className="hidden lg:flex flex-col gap-1\.5 pb-2 lg:pb-0" id="floors-selection-stack">.*?\[\.\.\.blockFloors\]\s*)\.sort\(\(a, b\) => a\.floorNumber - b\.floorNumber\)',
    r'\1.sort((a, b) => b.floorNumber - a.floorNumber)',
    content,
    flags=re.DOTALL
)

def fix_floor_label(match):
    prefix = match.group(1)
    return f"{prefix}{{selectedApartment.floorNumber < 0 ? (selectedApartment.isShopFloor ? 'Подвал' : 'Парковка') + ' (' + selectedApartment.floorNumber + ')' : selectedApartment.floorNumber + '-й этаж'}}"

content = re.sub(r'(<span className="text-xs font-black text-\[#0F172A\] mt-0\.5 truncate">)\{selectedApartment\.floorNumber\}-й этаж(</span>)', fix_floor_label, content)

content = content.replace("Этаж {selectedApartment.floorNumber}", "{selectedApartment.floorNumber < 0 ? (selectedApartment.isShopFloor ? 'Подвал' : 'Парковка') + ' ' + selectedApartment.floorNumber : 'Этаж ' + selectedApartment.floorNumber}")
content = content.replace("Этаж {selectedApartment?.floorNumber}", "{selectedApartment?.floorNumber < 0 ? (selectedApartment?.isShopFloor ? 'Подвал' : 'Парковка') + ' ' + selectedApartment?.floorNumber : 'Этаж ' + selectedApartment?.floorNumber}")
content = content.replace("Этаж {calcFloor}", "{calcFloor < 0 ? 'Подвал/Парковка ' + calcFloor : 'Этаж ' + calcFloor}")

with open('src/components/ApartmentsPage.tsx', 'w') as f:
    f.write(content)
