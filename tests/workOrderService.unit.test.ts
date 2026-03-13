import { mock, test, expect, describe, beforeEach } from "bun:test";

// Mock pg and uuid at the top level
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

// Setup mocks for @/services/database
const mockQuery = mock();
const mockRelease = mock(() => {});
const mockConnect = mock(async () => ({
  query: mockQuery,
  release: mockRelease,
}));

mock.module("../src/services/database", () => ({
  getPool: () => ({
    connect: mockConnect,
    query: mock(async () => ({ rows: [{ now: new Date() }] })),
    on: () => {},
  }),
  initializeSchema: async () => {}, // Mock this to avoid actual DB init
}));

import { getWorkOrderDetails } from "../src/services/workOrderService";

describe("getWorkOrderDetails", () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockConnect.mockClear();
    mockRelease.mockClear();
  });

  test("successfully fetches work order and tasks and releases connection", async () => {
    const mockWorkOrder = { id: "1", location: "Loc 1", goal: "Goal 1", status: "open" };
    const mockTasks = [{ id: "101", description: "Task 1", status: "pending" }];

    mockQuery
      .mockImplementationOnce(async () => ({ rows: [mockWorkOrder] }))
      .mockImplementationOnce(async () => ({ rows: mockTasks }));

    const result = await getWorkOrderDetails("1");

    expect(result).toEqual({
      workOrder: mockWorkOrder,
      tasks: mockTasks,
    });
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  test("returns null if work order is not found and releases connection", async () => {
    mockQuery.mockImplementationOnce(async () => ({ rows: [] }));

    const result = await getWorkOrderDetails("non-existent");

    expect(result).toBeNull();
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  test("throws error and releases connection if query for work order fails", async () => {
    mockQuery.mockImplementationOnce(async () => {
      throw new Error("DB Error: Work Order");
    });

    await expect(getWorkOrderDetails("1")).rejects.toThrow("DB Error: Work Order");
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  test("throws error and releases connection if query for tasks fails", async () => {
    const mockWorkOrder = { id: "1", location: "Loc 1", goal: "Goal 1", status: "open" };
    mockQuery
      .mockImplementationOnce(async () => ({ rows: [mockWorkOrder] }))
      .mockImplementationOnce(async () => {
        throw new Error("DB Error: Tasks");
      });

    await expect(getWorkOrderDetails("1")).rejects.toThrow("DB Error: Tasks");
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
