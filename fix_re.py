import re

with open('src/components/ApartmentsPage.tsx', 'r') as f:
    c = f.read()

# Fix missing span closing
c = re.sub(
    r'(\<span className="text-xs font-black text-\[#0F172A\] mt-0\.5 truncate"\>\{selectedApartment\.floorNumber \< 0 \? \(selectedApartment\.isShopFloor \? \'Подвал\' \: \'Парковка\'\) \+ \' \(\' \+ selectedApartment\.floorNumber \+ \'\)\' \: selectedApartment\.floorNumber \+ \'-й этаж\'\})',
    r'\1</span>',
    c
)

c = re.sub(r'selectedApartment\.isShopFloor', r'false', c)
c = re.sub(r'selectedApartment\?\.isShopFloor', r'false', c)

with open('src/components/ApartmentsPage.tsx', 'w') as f:
    f.write(c)

print("done regex")
