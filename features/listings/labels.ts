const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[\s_-]+/g, " ")
    .trim();

const fuelTypeTranslations: Record<string, string> = {
  бензин: "petrol",
  gasoline: "petrol",
  gas: "petrol",
  petrol: "petrol",
  diesel: "diesel",
  дизель: "diesel",
  електро: "electric",
  електричний: "electric",
  electric: "electric",
  hybrid: "hybrid",
  гібрид: "hybrid",
  гібридний: "hybrid",
  газ: "lpg",
  lpg: "lpg",
};

const bodyTypeTranslations: Record<string, string> = {
  легкові: "passenger car",
  "легковий автомобіль": "passenger car",
  "passenger car": "passenger car",
  sedan: "sedan",
  седан: "sedan",
  suv: "suv",
  позашляховик: "suv",
  crossover: "crossover",
  кросовер: "crossover",
  hatchback: "hatchback",
  хетчбек: "hatchback",
  wagon: "wagon",
  універсал: "wagon",
  купе: "coupe",
  coupe: "coupe",
  convertible: "convertible",
  кабріолет: "convertible",
  minivan: "minivan",
  мінівен: "minivan",
  pickup: "pickup",
  пікап: "pickup",
};

export function translateFuelType(value: string) {
  const normalized = normalize(value);
  return fuelTypeTranslations[normalized] || normalized || "unknown";
}

export function translateBodyType(value: string) {
  const normalized = normalize(value);
  return bodyTypeTranslations[normalized] || normalized || "unknown";
}
