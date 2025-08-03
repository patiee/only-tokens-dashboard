import { NetworkEnum } from "@1inch/fusion-sdk";

export const TOKENS = {
    [NetworkEnum.OSMOSIS]: {
        USDC: 'osmo1facacsudmmarmshj54306q8qlwyee2l369tn9c385xa8lkcz3snqrtw9ke',
        OSMO: 'uosmo',
        ATOM: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
    },
    [NetworkEnum.ETHEREUM_SEPOLIA]: {
        USDC: '0xA028858A023dcd285E17F745bC46f0f6eC221e79',
        ETH: '0x0000000000000000000000000000000000001010',
    },
    [NetworkEnum.POLYGON_AMOY]: {
        USDC: '0xA028858A023dcd285E17F745bC46f0f6eC221e79',
        MATIC: '0x0000000000000000000000000000000000001010',
    },
    [NetworkEnum.DOGECOIN]: {
        DOGE: 'DOGE'
    }
};