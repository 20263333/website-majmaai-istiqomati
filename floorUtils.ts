import { Floor, FloorType, BuildingBlock } from '../types';

export function recalculateApartmentNumbers(floors: Floor[], blocks: BuildingBlock[] = []): Floor[] {
  if (!floors || floors.length === 0) return [];

  const blockIdsFromBlocks = (blocks && blocks.length > 0) ? blocks.map(b => b.id) : [];
  const defaultBlockId = blockIdsFromBlocks[0] || 'block_default_a';
  
  // Collect all unique blockIds from floors and blocks
  const floorBlockIds = Array.from(new Set(floors.map(f => f.blockId || defaultBlockId)));
  const allBlockIds = Array.from(new Set([...blockIdsFromBlocks, ...floorBlockIds]));

  let resultFloors: Floor[] = [];

  for (const blockId of allBlockIds) {
    const blockFloors = floors.filter(f => (f.blockId || defaultBlockId) === blockId);
    if (blockFloors.length === 0) continue;

    const parkingFloors = blockFloors.filter(f => f.floorType === 'parking');
    const basementShopFloors = blockFloors.filter(f => f.floorType === 'basement_shop');
    const shopFloors = blockFloors.filter(f => f.floorType === 'shop' || (!f.floorType && f.isShopFloor === true));
    const aptFloors = blockFloors.filter(f => (f.floorType === 'apartment' || (!f.floorType && f.isShopFloor !== true)));

    const sortedParking = [...parkingFloors].sort((a, b) => a.floorNumber - b.floorNumber);
    const sortedBasement = [...basementShopFloors].sort((a, b) => a.floorNumber - b.floorNumber);
    const sortedShop = [...shopFloors].sort((a, b) => a.floorNumber - b.floorNumber);
    const sortedApt = [...aptFloors].sort((a, b) => a.floorNumber - b.floorNumber);

    const P = sortedParking.length;
    const BS = sortedBasement.length;
    const S = sortedShop.length;

    // 1. Parking floors
    let parkingSeq = 1;
    const finalParkingFloors = sortedParking.map((floor, index) => {
      const assignedFloorNum = -(P + BS - index);
      const updatedItems = (floor.apartments || []).map((apt) => {
        const currentNum = parkingSeq++;
        const isStandard = !apt.name || /^Ҷойи парковка\s*\d+$/i.test(apt.name.trim());
        return {
          ...apt,
          number: currentNum,
          name: isStandard ? `Ҷойи парковка ${currentNum}` : apt.name
        };
      });
      return {
        ...floor,
        blockId,
        floorNumber: assignedFloorNum,
        floorType: 'parking' as FloorType,
        isShopFloor: true,
        apartments: updatedItems
      };
    });

    // 2. Basement shop floors
    let basementSeq = 1;
    const finalBasementFloors = sortedBasement.map((floor, index) => {
      const assignedFloorNum = -(BS - index);
      const itemLabel = floor.customLabel || 'Мағоза';
      const updatedItems = (floor.apartments || []).map((apt) => {
        const currentNum = basementSeq++;
        const isStandard = !apt.name || new RegExp(`^${itemLabel}\\s*\\d+$`, 'i').test(apt.name.trim()) || /^Мағоза\s*\d+$/i.test(apt.name.trim());
        return {
          ...apt,
          number: currentNum,
          name: isStandard ? `${itemLabel} ${currentNum}` : apt.name
        };
      });
      return {
        ...floor,
        blockId,
        floorNumber: assignedFloorNum,
        floorType: 'basement_shop' as FloorType,
        isShopFloor: true,
        apartments: updatedItems
      };
    });

    // 3. Shop floors
    let shopSeq = 1;
    const finalShopFloors = sortedShop.map((floor, index) => {
      const assignedFloorNum = index + 1;
      const updatedShops = (floor.apartments || []).map((apt) => {
        const currentNum = shopSeq++;
        const isStandard = !apt.name || /^Мағозаи\s*\d+$/i.test(apt.name.trim()) || /^Мағоза\s*\d+$/i.test(apt.name.trim());
        return {
          ...apt,
          number: currentNum,
          name: isStandard ? `Мағозаи ${currentNum}` : apt.name
        };
      });
      return {
        ...floor,
        blockId,
        floorNumber: assignedFloorNum,
        floorType: 'shop' as FloorType,
        isShopFloor: true,
        apartments: updatedShops
      };
    });

    // 4. Apartment floors
    let aptSeq = 1;
    const finalAptFloors = sortedApt.map((floor, index) => {
      const assignedFloorNum = S + index + 1;
      const updatedApts = (floor.apartments || []).map((apt) => {
        const currentNum = aptSeq++;
        const isStandard = !apt.name || /^Хонаи\s*\d+$/i.test(apt.name.trim()) || /^Хона\s*\d+$/i.test(apt.name.trim()) || /^Квартира\s*\d+$/i.test(apt.name.trim()) || /^Кв\.\s*\d+$/i.test(apt.name.trim()) || /^Кв\s*\d+$/i.test(apt.name.trim()) || /^\d+$/i.test(apt.name.trim());
        return {
          ...apt,
          number: currentNum,
          name: isStandard ? `Хонаи ${currentNum}` : apt.name
        };
      });
      return {
        ...floor,
        blockId,
        floorNumber: assignedFloorNum,
        floorType: 'apartment' as FloorType,
        isShopFloor: false,
        apartments: updatedApts
      };
    });

    resultFloors.push(...finalParkingFloors, ...finalBasementFloors, ...finalShopFloors, ...finalAptFloors);
  }

  return resultFloors;
}
