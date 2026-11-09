export type Weapon = {
  id: string;
  name: string;
  classLabel: string;
  caliberLabel: string;
  profileId?: string;
};

export const WEAPON_CLASSES: { classLabel: string; caliberLabel: string }[] = [
  { classLabel: "Luftpistol", caliberLabel: "4,5 mm" },
  { classLabel: "Finpistol", caliberLabel: ".22 LR" },
  { classLabel: "Grovpistol", caliberLabel: "7,62–9,65 mm" },
  { classLabel: "IPSC", caliberLabel: "minor / major" },
];
