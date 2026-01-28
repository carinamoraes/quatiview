import Chunk from './Chunk.js';

import {
	InvalidAddress,
	UnallocatedMemoryAccess,
	UninitializedMemoryAccess,
	FreeingANonAllocationAddress,
} from '../errors.js';

const UNINITIALIZED_BYTE = Symbol('UNINITIALIZED_BYTE');
const DETERMINISTIC = false;

let rseed = 0;
const srand = () => ((++rseed) % Math.PI) / Math.PI;
const random = DETERMINISTIC ? srand : Math.random;
const pickRandomly = (arr) => arr[arr.length*random() | 0];

const FIRST_ADDRESS = 0x0100;
const LAST_ADDRESS  = 0xffff;

let bytes;
let allocations;
let chunkList;

const validateAddr = (addr) => {
	if (addr < FIRST_ADDRESS || addr > LAST_ADDRESS) {
		throw new InvalidAddress(addr);
	}
};

export const wordCount = (addr) => {
	return (addr + 3) & ~3;
};

export const clear = () => {
	bytes = window.bytes = {};
	allocations = window.allocations = {};
	chunkList = window.chunkList = new Chunk({
		addr: FIRST_ADDRESS,
		size: LAST_ADDRESS - FIRST_ADDRESS + 1,
	});
};

export const allocate = (numberOfBytes) => {
	const size = wordCount(numberOfBytes);
	const chunks = [];
	for (let chunk=chunkList; chunk!==null; chunk=chunk.next) {
		if (chunk.allocated === false && chunk.size >= size) {
			chunks.push(chunk);
		}
	}
	if (chunks.length === 0) {
		return 0;
	}
	const chunk = pickRandomly(chunks);
	const freeWords = (chunk.size - size) >> 2;
	const offset = (Math.random()*(freeWords + 1) | 0) << 2;
	const addr = chunk.addr + offset;
	allocations[addr] = chunk.allocate(addr, size);
	for (let i=0; i<size; ++i) {
		bytes[addr + i] = UNINITIALIZED_BYTE;
	}
	return addr;
};

export const free = (addr) => {
	validateAddr(addr);
	const chunk = allocations[addr];
	if (chunk === undefined) {
		throw new FreeingANonAllocationAddress(addr);
	}
	const { size } = chunk;
	for (let i=0; i<size; ++i) {
		delete bytes[addr + i];
	}
	chunk.free();
	delete allocations[addr];
};

export const read = (addr) => {
	validateAddr(addr);
	const byte = bytes[addr];
	if (byte === undefined) {
		throw new UnallocatedMemoryAccess(addr);
	}
	if (byte === UNINITIALIZED_BYTE) {
		throw new UninitializedMemoryAccess(addr);
	}
	return byte;
};

export const write = (addr, byte) => {
	validateAddr(addr);
	if (bytes[addr] === undefined) {
		throw new UnallocatedMemoryAccess(addr);
	}
	bytes[addr] = byte;
};

export const readWord = (addr) => {
	return (
		read(addr)
		| (read(addr + 1) << 8)
		| (read(addr + 2) << 16)
		| (read(addr + 3) << 24)
	);
};

export const writeWord = (addr, word) => {
	write(addr, word & 255);
	write(addr + 1, (word >> 8) & 255);
	write(addr + 2, (word >> 16) & 255);
	write(addr + 3, (word >> 24) & 255);
};

export const readWordSafe = (addr, word) => {
	let res = 0;
	for (let i=0; i<4; ++i) {
		const byte = bytes[addr + i];
		if (byte === undefined || byte === UNINITIALIZED_BYTE) {
			return null;
		}
		res |= byte << (i << 3);
	}
	return res;
};

export const readSafe = (addr) => {
	const byte = bytes[addr];
	if (byte === undefined || byte === UNINITIALIZED_BYTE) {
		return null;
	}
	return byte;
};

clear();
