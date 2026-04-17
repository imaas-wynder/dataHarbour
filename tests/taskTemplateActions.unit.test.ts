import { describe, it, expect, mock, beforeEach, spyOn } from 'bun:test';
import { fetchTaskTemplates, saveTaskTemplate } from '@/services/db/taskTemplateActions';
import { getAllTaskTemplates, createTaskTemplate } from '@/services/workOrderService';
import { revalidatePath } from 'next/cache';

// Mocking the dependencies
mock.module('@/services/workOrderService', () => ({
    getAllTaskTemplates: mock(() => Promise.resolve([])),
    createTaskTemplate: mock(() => Promise.resolve()),
}));

mock.module('next/cache', () => ({
    revalidatePath: mock(() => {}),
}));

describe('taskTemplateActions', () => {
    beforeEach(() => {
        mock.restore();
    });

    describe('fetchTaskTemplates', () => {
        it('should return templates from getAllTaskTemplates', async () => {
            const mockTemplates = [
                { id: '1', name: 'Template 1', description: 'Desc 1', steps: ['Step 1'] }
            ];

            (getAllTaskTemplates as any).mockImplementation(() => Promise.resolve(mockTemplates));

            const result = await fetchTaskTemplates();

            expect(result).toEqual(mockTemplates);
            expect(getAllTaskTemplates).toHaveBeenCalled();
        });

        it('should return an empty array and log error when getAllTaskTemplates fails', async () => {
            const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
            (getAllTaskTemplates as any).mockImplementation(() => Promise.reject(new Error('DB Error')));

            const result = await fetchTaskTemplates();

            expect(result).toEqual([]);
            expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch task templates:', expect.any(Error));

            consoleSpy.mockRestore();
        });
    });

    describe('saveTaskTemplate', () => {
        it('should call createTaskTemplate and revalidatePath', async () => {
            const name = 'New Template';
            const description = 'New Description';
            const steps = ['Step 1', 'Step 2'];

            await saveTaskTemplate(name, description, steps);

            expect(createTaskTemplate).toHaveBeenCalledWith(name, description, steps);
            expect(revalidatePath).toHaveBeenCalledWith('/admin');
        });
    });
});
