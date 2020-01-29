import { PrivateKey } from "../PrivateKey";
import { S256Point } from "../S256Point";

// https://github.com/bitcoin/bips/blob/master/bip-0340/test-vectors.csv
test("schnorr create sig", async () => {
    let privateKey = new PrivateKey(0x0000000000000000000000000000000000000000000000000000000000000001n);
    let message = 0x0000000000000000000000000000000000000000000000000000000000000000n;
    expect(privateKey.schnorrSign(message)).toStrictEqual(Buffer.from("528F745793E8472C0329742A463F59E58F3A3F1A4AC09C28F6F8514D4D0322A258BD08398F82CF67B812AB2C7717CE566F877C2F8795C846146978E8F04782AE", "hex"));
    privateKey = new PrivateKey(0xB7E151628AED2A6ABF7158809CF4F3C762E7160F38B4DA56A784D9045190CFEFn);
    message = 0x243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC4E6C89n;
    expect(privateKey.schnorrSign(message)).toStrictEqual(Buffer.from("667C2F778E0616E611BD0C14B8A600C5884551701A949EF0EBFD72D452D64E844160BCFC3F466ECB8FACD19ADE57D8699D74E7207D78C6AEDC3799B52A8E0598", "hex"));
    privateKey = new PrivateKey(0xC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B14E5C9n);
    message = 0x5E2D58D8B3BCDF1ABADEC7829054F90DDA9805AAB56C77333024B9D0A508B75Cn;
    expect(privateKey.schnorrSign(message)).toStrictEqual(Buffer.from("2D941B38E32624BF0AC7669C0971B990994AF6F9B18426BF4F4E7EC10E6CDF386CF646C6DDAFCFA7F1993EEB2E4D66416AEAD1DDAE2F22D63CAD901412D116C6", "hex"));
    privateKey = new PrivateKey(0x0B432B2677937381AEF05BB02A66ECD012773062CF3FA2549E44F58ED2401710n);
    message = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn;
    expect(privateKey.schnorrSign(message)).toStrictEqual(Buffer.from("8BD2C11604B0A87A443FCC2E5D90E5328F934161B18864FB48CE10CB59B45FB9B5B2A0F129BD88F5BDC05D5C21E5C57176B913002335784F9777A24BD317CD36", "hex"));
});

// https://github.com/bitcoin/bips/blob/master/bip-0340/test-vectors.csv
test("schnorr verify sig", async () => {
    let publicKey = S256Point.schnorrParse(Buffer.from("D69C3509BB99E412E68B0FE8544E72837DFA30746D8BE2AA65975F29D22DC7B9", "hex"));
    let message = 0x4DF3C3F68FCC83B27E9D42C90431A72499F17875C81A599B566C9889B9696703n;
    let sig = Buffer.from("00000000000000000000003B78CE563F89A0ED9414F5AA28AD0D96D6795F9C63EE374AC7FAE927D334CCB190F6FB8FD27A2DDC639CCEE46D43F113A4035A2C7F", "hex");
    expect(publicKey.schnorrVerify(message, sig)).toBe(true);
    expect(() => S256Point.schnorrParse(Buffer.from("EEFDEA4CDB677750A420FEE807EACF21EB9898AE79B9768766E4FAA04A2D4A34", "hex"))).toThrowError("not on the curve");
    publicKey = S256Point.schnorrParse(Buffer.from("DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B502BA659", "hex"));
    message = 0x243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC4E6C89n;
    sig = Buffer.from("F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BCE036F9935554D1AA5F0374E5CDAACB3925035C7C169B27C4426DF0A6B19AF3BAEAB138", "hex");
    expect(publicKey.schnorrVerify(message, sig)).toBe(false);
    sig = Buffer.from("10AC49A6A2EBF604189C5F40FC75AF2D42D77DE9A2782709B1EB4EAF1CFE9108D7003B703A3499D5E29529D39BA040A44955127140F81A8A89A96F992AC0FE79", "hex");
    expect(publicKey.schnorrVerify(message, sig)).toBe(false);
    sig = Buffer.from("667C2F778E0616E611BD0C14B8A600C5884551701A949EF0EBFD72D452D64E84BE9F4303C0B9913470532E6521A827951D39F5C631CFD98CE39AC4D7A5A83BA9", "hex");
    expect(publicKey.schnorrVerify(message, sig)).toBe(false);
    sig = Buffer.from("000000000000000000000000000000000000000000000000000000000000000099D2F0EBC2996808208633CD9926BF7EC3DAB73DAAD36E85B3040A698E6D1CE0", "hex");
    expect(publicKey.schnorrVerify(message, sig)).toBe(false);
    sig = Buffer.from("000000000000000000000000000000000000000000000000000000000000000124E81D89F01304695CE943F7D5EBD00EF726A0864B4FF33895B4E86BEADC5456", "hex");
    expect(publicKey.schnorrVerify(message, sig)).toBe(false);
    sig = Buffer.from("4A298DACAE57395A15D0795DDBFD1DCB564DA82B0F269BC70A74F8220429BA1D4160BCFC3F466ECB8FACD19ADE57D8699D74E7207D78C6AEDC3799B52A8E0598", "hex");
    expect(publicKey.schnorrVerify(message, sig)).toBe(false);
    sig = Buffer.from("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F4160BCFC3F466ECB8FACD19ADE57D8699D74E7207D78C6AEDC3799B52A8E0598", "hex");
    expect(publicKey.schnorrVerify(message, sig)).toBe(false);
    sig = Buffer.from("667C2F778E0616E611BD0C14B8A600C5884551701A949EF0EBFD72D452D64E84FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", "hex");
    expect(publicKey.schnorrVerify(message, sig)).toBe(false);
    expect(() => S256Point.schnorrParse(Buffer.from("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC30", "hex"))).toThrowError("not in field range");
})

// https://github.com/bitcoin/bips/blob/master/bip-0340/test-vectors.csv
test("schnorr private to public", () => {
    let privateKey = new PrivateKey(0x0000000000000000000000000000000000000000000000000000000000000001n);
    expect(privateKey.point.schnorrSerialize()).toStrictEqual(Buffer.from("79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", "hex"));
    privateKey = new PrivateKey(0xB7E151628AED2A6ABF7158809CF4F3C762E7160F38B4DA56A784D9045190CFEFn);
    expect(privateKey.point.schnorrSerialize()).toStrictEqual(Buffer.from("DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B502BA659", "hex"));
    privateKey = new PrivateKey(0xC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B14E5C9n);
    expect(privateKey.point.schnorrSerialize()).toStrictEqual(Buffer.from("DD308AFEC5777E13121FA72B9CC1B7CC0139715309B086C960E18FD969774EB8", "hex"));
    privateKey = new PrivateKey(0x0B432B2677937381AEF05BB02A66ECD012773062CF3FA2549E44F58ED2401710n);
    expect(privateKey.point.schnorrSerialize()).toStrictEqual(Buffer.from("25D1DFF95105F5253C4022F628A996AD3A0D95FBF21D468A1B33F8C160D8F517", "hex"));

});