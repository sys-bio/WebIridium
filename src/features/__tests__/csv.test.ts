import { describe, it, expect } from "vitest";
import { convertColumnsToCsv, escapeCsvCell } from "../csv";

describe("escaping", () => {
  it("should not escape stuff that should need to be escaped", () => {
    const things = [
      "hello world",
      "lapwelfplwa fplwapflwpaflpql23pl fpql 23qlf[q3lfpq3flq23pf",
      "1231k12o4k1241;2'1'24'124;14;4;2;$!@#$!@#%!)(@#(*^@)#*%!)@#*%!@)#%*!@)$@!(!@)#$(@!)%*@#%)*@!#R*D)FA*S)AZC)XIVI#@F)#Q$KF!)@# K)@@@@3r q o fsvsmfl3m4f mwlfkw3m4f lw34m 2 r3r1r",
      "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum.",
      "()()()1234()-213501235-123-----)",
    ];

    for (const thing of things) {
      expect(escapeCsvCell(thing)).toEqual(thing);
    }
  });

  it("should escape new lines", () => {
    expect(escapeCsvCell("hello\nworld")).toEqual('"hello\nworld"');
  });

  it("should escape quotes", () => {
    expect(escapeCsvCell('test " test " test')).toEqual(
      '"test "" test "" test"',
    );
    expect(escapeCsvCell('hey\ntest " test " test')).toEqual(
      '"hey\ntest "" test "" test"',
    );
  });

  it("should escape commas", () => {
    expect(escapeCsvCell("hello, world")).toEqual('"hello, world"');
  });
});

describe("convert columns to csv", () => {
  it("should work", () => {
    const columns = [
      { title: "test", values: [1, 2, 3, 4] },
      { title: "test2", values: [2, 3, 4, 5] },
    ];

    expect(convertColumnsToCsv(columns)).toEqual(`test,test2
1,2
2,3
3,4
4,5`);
  });

  it("should escape cells", () => {
    const columns = [
      { title: "test", values: [1, 2, 3, 4] },
      { title: "test2", values: [2, ",", 4, 5] },
    ];

    expect(convertColumnsToCsv(columns)).toEqual(`test,test2
1,2
2,","
3,4
4,5`);
  });
});
