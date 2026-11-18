with open('src/components/ApartmentsPage.tsx', 'r') as f:
    c = f.read()

c = c.replace(
    '''{selectedApartment.floorNumber < 0 ? (selectedApartment.isShopFloor ? 'Подвал' : 'Парковка') + ' (' + selectedApartment.floorNumber + ')' : selectedApartment.floorNumber + '-й этаж'}
                    </div>''',
    '''{selectedApartment.floorNumber < 0 ? 'Подвал/Парковка (' + selectedApartment.floorNumber + ')' : selectedApartment.floorNumber + '-й этаж'}</span>
                    </div>'''
)

c = c.replace("{selectedApartment.floorNumber < 0 ? (selectedApartment.isShopFloor ? 'Подвал' : 'Парковка') + ' ' + selectedApartment.floorNumber : 'Этаж ' + selectedApartment.floorNumber}",
             "{selectedApartment.floorNumber < 0 ? 'Подвал/Парковка ' + selectedApartment.floorNumber : 'Этаж ' + selectedApartment.floorNumber}")

c = c.replace("{selectedApartment?.floorNumber < 0 ? (selectedApartment?.isShopFloor ? 'Подвал' : 'Парковка') + ' ' + selectedApartment?.floorNumber : 'Этаж ' + selectedApartment?.floorNumber}",
             "{selectedApartment?.floorNumber < 0 ? 'Подвал/Парковка ' + selectedApartment?.floorNumber : 'Этаж ' + selectedApartment?.floorNumber}")

with open('src/components/ApartmentsPage.tsx', 'w') as f:
    f.write(c)
