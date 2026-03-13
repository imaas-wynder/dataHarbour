'use server';

import { getWorkOrderDetails, completeTask } from '@/services/workOrderService';
import { revalidatePath } from 'next/cache';
import { verifyAuth } from '@/lib/auth';

export async function fetchWorkOrderData(workOrderId: string) {
    try {
        return await getWorkOrderDetails(workOrderId);
    } catch (error) {
        console.error('Error fetching work order:', error);
        return null;
    }
}

export async function markTaskAsComplete(taskId: string, workOrderId: string) {
    try {
        const userId = await verifyAuth();
        await completeTask(taskId, userId);
        revalidatePath(`/work-orders/${workOrderId}`);
    } catch (error) {
        console.error('Unauthorized attempt to mark task as complete:', error);
        throw new Error('Unauthorized');
    }
}