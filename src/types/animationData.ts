export interface AnimationAsset {
  uid: string;
  name: string;
  base64: string;
}

export interface AnimationData {
  animations: Record<string, AnimationAsset>;
}

export const SAMPLE_ANIMATION_DATA: AnimationData = {
  animations: {
    welcome_1: {
      uid: "welcome_1",
      name: "welcome home",
      base64: "data:application/octet-stream;base64,iVBORw0KUgAA...",
    },
    newyear_2025: {
      uid: "newyear_2025",
      name: "new year animation",
      base64: "data:application/octet-stream;base64,ABCDSDFD1234...",
    },
    spark_2: {
      uid: "spark_2",
      name: "spark water jump",
      base64: "data:application/octet-stream;base64,AB@#$CD1234...",
    },
    anim002: {
      uid: "anim002",
      name: "generic animation",
      base64: "data:application/octet-stream;base64,ABCDSF$%D1234...",
    },
    good_light_1: {
      uid: "good_light_1",
      name: "up mood light",
      base64: "data:application/octet-stream;base64,ABCD123E$$%4...",
    },
  },
};
