import { mock } from "bun:test";

mock.module("pg", () => ({
  Pool: class {
    connect = async () => ({
      query: async () => ({ rows: [] }),
      release: () => {},
    });
    on = () => {};
    query = async () => ({ rows: [] });
  },
}));

mock.module("uuid", () => ({
  v4: () => "mock-uuid",
}));
