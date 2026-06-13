import DiamondRock from "../assets/rocks/Diamond.png";
import GoldRock from "../assets/rocks/Gold.png";
import BronzeRock from "../assets/rocks/Bronze.png";
import StoneRock from "../assets/rocks/Stone.png";
import BossStone from "../assets/rocks/BossStone.png";

export const ROCK_ASSETS = {
  Diamond: DiamondRock,
  Gold: GoldRock,
  Bronze: BronzeRock,
  Stone: StoneRock,
};

export const BOSS_ASSETS = {
  full: BossStone,
};

export const ROCK_CONFIG = {
  Diamond: { name: "Diamond", points: 50, color: "#ec4899" },
  Gold: { name: "Gold", points: 20, color: "#fbbf24" },
  Bronze: { name: "Bronze", points: 10, color: "#d97706" },
  Stone: { name: "Stone", points: 5, color: "#94a3b8" },
};
