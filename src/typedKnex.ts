// tslint:disable:use-named-parameter
import * as Knex from 'knex';
import { getColumn, getTableMetadata } from './decorators';
import { unflatten } from './unflatten';

type TransformAll<T, IT> = {
    [Key in keyof T]: IT
};

type FilterObjectsOnly<T> = { [K in keyof T]: T[K] extends object ? K : never }[keyof T];
type FilterNonObjects<T> = { [K in keyof T]: T[K] extends object ? never : K }[keyof T];


export class TypedKnex {

    constructor(private knex: Knex) {

    }

    public query<T>(tableClass: new () => T): TypedQueryBuilder<T> {

        return new TypedQueryBuilder<T>(tableClass, this.knex);
    }

}

class TypedQueryBuilder<Model, Row = {}> {

    private queryBuilder: Knex.QueryBuilder;
    private tableName: string;

    constructor(private tableClass: new () => Model, private knex: Knex) {
        this.tableName = this.getTableName(tableClass);
        this.queryBuilder = this.knex.from(this.tableName);
    }

    public selectColumns<Prev extends Row, K1 extends FilterObjectsOnly<Model>, K2 extends FilterNonObjects<Model[K1]>>(key1: K1, keys2: K2[]): TypedQueryBuilder<Model, TransformAll<Pick<Model, K1>, Pick<Model[K1], K2>> & Prev>;
    public selectColumns<K extends FilterNonObjects<Model>>(keys: K[]): TypedQueryBuilder<Model, Pick<Model, K> & Row>;
    public selectColumns<K extends FilterNonObjects<Model>>(keys1: K[] | string, keys2?: K[]): TypedQueryBuilder<Model, Pick<Model, K> & Row> {

        // const prefix = typeof arguments[0] === 'string' ? arguments[0] + '_' : '';
        const argumentsKeys = arguments[arguments.length - 1];
        for (const key of argumentsKeys) {
            // this.queryBuilder.select(prefix + key);


            if (arguments.length === 1) {
                this.queryBuilder.select(key);
            } else {

                this.queryBuilder.select(this.getColumnName(arguments[0], key) + ' as ' + this.getColumnAlias(arguments[0], key));
            }
        }
        return this as any;
    }

    public selectColumn<Prev extends Row, K1 extends FilterObjectsOnly<Model>, K2 extends FilterObjectsOnly<Model[K1]>, K3 extends FilterObjectsOnly<Model[K1][K2]>>(key1: K1, key2: K2, key3: K3, ...keys: string[]): TypedQueryBuilder<Model, TransformAll<Pick<Model, K1>, TransformAll<Pick<Model[K1], K2>, TransformAll<Pick<Model[K1][K2], K3>, any>>> & Prev>;
    public selectColumn<Prev extends Row, K1 extends FilterObjectsOnly<Model>, K2 extends FilterObjectsOnly<Model[K1]>, K3 extends FilterNonObjects<Model[K1][K2]>>(key1: K1, key2: K2, key3: K3): TypedQueryBuilder<Model, TransformAll<Pick<Model, K1>, TransformAll<Pick<Model[K1], K2>, Pick<Model[K1][K2], K3>>> & Prev>;
    public selectColumn<Prev extends Row, K1 extends FilterObjectsOnly<Model>, K2 extends FilterNonObjects<Model[K1]>>(key1: K1, key2: K2): TypedQueryBuilder<Model, TransformAll<Pick<Model, K1>, Pick<Model[K1], K2>> & Prev>;
    public selectColumn<K extends FilterNonObjects<Model>>(key1: K): TypedQueryBuilder<Model, Pick<Model, K> & Row>;
    public selectColumn<Prev extends Row, K1 extends keyof Model, K2 extends keyof Model[K1]>(key1: K1, key2?: K2): TypedQueryBuilder<Model, TransformAll<Pick<Model, K1>, Pick<Model[K1], K2>> & Prev> {


        if (arguments.length === 1) {
            this.queryBuilder.select(arguments[0]);
        } else {

            this.queryBuilder.select(this.getColumnName(...arguments) + ' as ' + this.getColumnAlias(...arguments));
        }
        return this as any;
    }



    public where<K extends FilterNonObjects<Model>>(key1: K, value: Model[K]): this;
    public where<K1 extends keyof Model, K2 extends FilterNonObjects<Model[K1]>>(key1: K1, key2: K2, value: Model[K1][K2]): this;
    public where<K1 extends keyof Model, K2 extends keyof Model[K1], K3 extends FilterNonObjects<Model[K1][K2]>>(key1: K1, key2: K2, key3: K3, value: Model[K1][K2][K3]): this;
    public where<K1 extends keyof Model, K2 extends keyof Model[K1], K3 extends keyof Model[K1][K2]>(key1: K1, key2: K2, key3: K3, ...keysAndValues: any[]): this;
    public where<K1 extends keyof Model, K2 extends keyof Model[K1], K3 extends keyof Model[K1][K2]>(key1?: K1, key2?: K2, key3?: K3, value?: Model[K1][K2][K3] | Model[K1][K2] | Model[K1]): this {
        const argumentsExpectLast = [...(arguments as any)].slice(0, -1);
        this.queryBuilder.where(this.getColumnName(...argumentsExpectLast), arguments[arguments.length - 1]);

        return this;
    }



    public innerJoinColumn<K1 extends FilterObjectsOnly<Model>, K2 extends FilterObjectsOnly<Model[K1]>>(key1: K1, key2: K2, ...keys: string[]): this;
    public innerJoinColumn<K1 extends FilterObjectsOnly<Model>, K2 extends FilterObjectsOnly<Model[K1]>>(key1: K1, key2: K2): this;
    public innerJoinColumn<K extends FilterObjectsOnly<Model>>(key1: K): this;
    public innerJoinColumn<K1 extends FilterObjectsOnly<Model>, K2 extends FilterObjectsOnly<Model[K1]>>(key1?: K1, key2?: K2): this {

        let firstColumnAlias = this.tableName;
        let firstColumnClass = this.tableClass;
        let secondColumnAlias = arguments[0];
        let secondColumnName = arguments[0];
        let secondColumnClass = getColumn(firstColumnClass.prototype, secondColumnAlias).columnClass;


        for (let i = 1; i < arguments.length; i++) {
            const beforeSecondColumnAlias = secondColumnAlias;
            const beforeSecondColumnClass = secondColumnClass;


            secondColumnName = arguments[i];
            secondColumnAlias = beforeSecondColumnAlias + '_' + arguments[i];
            secondColumnClass = getColumn(beforeSecondColumnClass.prototype, arguments[i]).columnClass;

            firstColumnAlias = beforeSecondColumnAlias;
            firstColumnClass = beforeSecondColumnClass;
        }
        const tableToJoinName = this.getTableName(secondColumnClass);
        const tableToJoinAlias = secondColumnAlias;
        const tableToJoinJoinColumnName = `${tableToJoinAlias}.id`;
        const tableJoinedColumnName = `${firstColumnAlias}.${secondColumnName}Id`;

        this.queryBuilder.join(`${tableToJoinName} as ${tableToJoinAlias}`, tableToJoinJoinColumnName, tableJoinedColumnName);

        return this;
    }



    public async firstItem(): Promise<Row | undefined> {
        const items = await this.queryBuilder;
        if (!items || items.length === 0) {
            return undefined;
        }
        return unflatten(items[0]);
    }


    public knexFunction(f: (query: Knex.QueryBuilder) => void) {
        f(this.queryBuilder);
    }

    public toQuery() {
        return this.queryBuilder.toQuery();
    }


    private getTableName(tableClass: new () => any) {
        try {

            return getTableMetadata(tableClass).tableName;
        } catch (e) {
            throw new Error(`Cannot get table name from class ${tableClass.name} `);
        }
    }

    private getColumnAlias(...keys: string[]): string {
        if (arguments.length === 1) {
            return arguments[0];
        } else {
            let columnAlias = arguments[0];
            for (let i = 1; i < arguments.length; i++) {
                columnAlias += '_' + arguments[i];
            }
            return columnAlias;
        }
    }

    private getColumnName(...keys: string[]): string {
        if (arguments.length === 1) {
            return arguments[0];
        } else {
            let columnName = arguments[0];
            let columnAlias = arguments[0];
            for (let i = 1; i < arguments.length; i++) {
                columnName = columnAlias + '.' + arguments[i];
                columnAlias += '_' + arguments[i];
            }
            return columnName;
        }
    }




}

