import { mock } from 'bun:test';

mock.module('next/cache', () => ({
    revalidatePath: mock(() => {}),
}));

mock.module('@/services/workOrderService', () => ({
    getAllTaskTemplates: mock(() => Promise.resolve([])),
    createTaskTemplate: mock(() => Promise.resolve()),
}));

mock.module('pg', () => ({
    Pool: class {
        connect = () => Promise.resolve({
            query: () => Promise.resolve({ rows: [] }),
            release: () => {},
        });
    },
}));
